const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { notifyOwner } from '../_shared/notify-owner.ts';

interface DemandCluster {
  city: string;
  state: string;
  bedrooms: string;
  count: number;
}

interface SearchResult {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
}

const EXCLUDED_STATES = ['NY', 'New York'];
const DALLAS_METRO_CITIES = [
  'dallas', 'fort worth', 'arlington', 'plano', 'irving', 'garland',
  'grand prairie', 'mckinney', 'frisco', 'mesquite', 'carrollton',
  'denton', 'richardson', 'lewisville', 'allen', 'flower mound',
  'mansfield', 'cedar hill', 'desoto', 'duncanville', 'lancaster',
  'rowlett', 'wylie', 'sachse', 'murphy', 'the colony',
];

function isDallasMetro(city: string): boolean {
  return DALLAS_METRO_CITIES.includes(city.toLowerCase().trim());
}

function isExcluded(state: string): boolean {
  return EXCLUDED_STATES.some(s => s.toLowerCase() === state.toLowerCase().trim());
}

function buildSearchQuery(bedrooms: string, city: string, state: string): string {
  return `${bedrooms} bedroom section 8 house for rent ${city} ${state}`;
}

function extractPropertyInfo(result: SearchResult): {
  street_address: string | null;
  bedrooms: number | null;
  rent: number | null;
  listingTitle: string;
} | null {
  const text = [result.title, result.description, result.markdown].filter(Boolean).join(' ');
  if (!text || text.length < 10) return null;

  const rentMatch = text.match(/\$([0-9,]+)\s*(?:\/\s*(?:mo|month)|per\s*month)?/i);
  const rent = rentMatch ? parseInt(rentMatch[1].replace(',', ''), 10) : null;

  const bedMatch = text.match(/(\d+)\s*(?:bed(?:room)?s?|br|BD)/i);
  const bedrooms = bedMatch ? parseInt(bedMatch[1], 10) : null;

  const streetMatch = text.match(/(\d{1,6}\s+[A-Za-z0-9\s.]+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Ln|Lane|Way|Ct|Court|Pl|Place|Cir|Circle|Pkwy|Parkway)\.?)/i);
  const street_address = streetMatch ? streetMatch[1].trim() : null;

  const listingTitle = result.title?.replace(/\s*\|.*$/, '').replace(/\s*-.*$/, '').trim() || '';

  return { street_address, bedrooms, rent, listingTitle };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Wang Scout] Starting demand analysis...');

    // 1. Get tenant demand clusters
    const { data: tenants, error: tenantError } = await supabase
      .from('tenant_profiles')
      .select('desired_city, desired_state, bedrooms_approved')
      .not('desired_city', 'is', null);

    if (tenantError) throw new Error(`Tenant query failed: ${tenantError.message}`);

    const clusterMap = new Map<string, DemandCluster>();
    for (const t of tenants || []) {
      if (!t.desired_city || !t.desired_state) continue;
      if (isExcluded(t.desired_state)) continue;

      const bedroomsList: string[] = Array.isArray(t.bedrooms_approved) 
        ? t.bedrooms_approved 
        : t.bedrooms_approved ? [t.bedrooms_approved] : ['3'];

      for (const bed of bedroomsList) {
        const key = `${t.desired_city.toLowerCase().trim()}|${t.desired_state}|${bed}`;
        const existing = clusterMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          clusterMap.set(key, {
            city: t.desired_city.trim(),
            state: t.desired_state.trim(),
            bedrooms: bed,
            count: 1,
          });
        }
      }
    }

    const clusters = Array.from(clusterMap.values()).sort((a, b) => b.count - a.count);
    console.log(`[Wang Scout] Found ${clusters.length} demand clusters from ${tenants?.length || 0} tenants`);

    if (clusters.length === 0) {
      clusters.push(
        { city: 'Dallas', state: 'TX', bedrooms: '3', count: 0 },
        { city: 'Dallas', state: 'TX', bedrooms: '2', count: 0 },
      );
    }

    // 2. Apply Dallas 60/40 allocation
    const dallasClusters = clusters.filter(c => isDallasMetro(c.city));
    const otherClusters = clusters.filter(c => !isDallasMetro(c.city));

    const MAX_SEARCHES = 10;
    const dallasSlots = Math.min(Math.ceil(MAX_SEARCHES * 0.6), dallasClusters.length);
    const otherSlots = Math.min(MAX_SEARCHES - dallasSlots, otherClusters.length);

    const searchClusters = [
      ...dallasClusters.slice(0, dallasSlots),
      ...otherClusters.slice(0, otherSlots),
    ];

    console.log(`[Wang Scout] Running ${searchClusters.length} searches (${dallasSlots} Dallas, ${otherSlots} other)`);

    // 3. Get existing leads for dedup
    const { data: existingLeads } = await supabase
      .from('scout_leads')
      .select('street_address, source_url');

    const existingAddresses = new Set(
      (existingLeads || []).flatMap(p => [
        p.street_address?.toLowerCase().trim(),
        p.source_url?.toLowerCase().trim(),
      ].filter(Boolean))
    );

    // 4. Search via Firecrawl and stage as leads
    let totalFound = 0;
    let totalInserted = 0;
    const errors: string[] = [];

    for (const cluster of searchClusters) {
      const query = buildSearchQuery(cluster.bedrooms, cluster.city, cluster.state);
      console.log(`[Wang Scout] Searching: "${query}"`);

      try {
        const response = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            limit: 5,
            lang: 'en',
            country: 'us',
          }),
        });

        const searchData = await response.json();

        if (!response.ok) {
          console.error(`[Wang Scout] Search failed for "${query}":`, searchData);
          errors.push(`Search failed: ${query}`);
          continue;
        }

        const results: SearchResult[] = searchData.data || [];
        totalFound += results.length;

        for (const result of results) {
          if (!result.url) continue;

          const info = extractPropertyInfo(result);
          if (!info) continue;

          // Dedup by address or URL
          const addrLower = info.street_address?.toLowerCase().trim();
          const urlLower = result.url.toLowerCase().trim();
          if ((addrLower && existingAddresses.has(addrLower)) || existingAddresses.has(urlLower)) {
            console.log(`[Wang Scout] Skipping duplicate: ${info.street_address || result.url}`);
            continue;
          }

          // Insert into scout_leads (staging table)
          const { error: insertError } = await supabase
            .from('scout_leads')
            .insert({
              street_address: info.street_address,
              city: cluster.city,
              state: cluster.state,
              bedrooms: info.bedrooms || parseInt(cluster.bedrooms, 10) || null,
              rent: info.rent,
              source_url: result.url,
              listing_title: info.listingTitle || result.title || null,
              search_query: query,
              status: 'pending',
            });

          if (insertError) {
            console.error(`[Wang Scout] INSERT ERROR:`, insertError.message);
            errors.push(`Insert failed: ${info.street_address || result.url} — ${insertError.message}`);
          } else {
            if (addrLower) existingAddresses.add(addrLower);
            existingAddresses.add(urlLower);
            totalInserted++;
            console.log(`[Wang Scout] Staged lead: ${info.street_address || result.url} (${cluster.city}, ${cluster.state})`);
          }
        }

        await new Promise(r => setTimeout(r, 500));
      } catch (searchErr) {
        console.error(`[Wang Scout] Search error for "${query}":`, searchErr);
        errors.push(`Error: ${query}`);
      }
    }

    // 5. Log activity
    await supabase.from('agent_activity_logs').insert({
      agent_id: 'scout',
      action: 'Search Complete',
      detail: `Found ${totalFound} results, staged ${totalInserted} new leads. ${errors.length} errors.`,
      log_type: 'activity',
    });

    const now = new Date().toISOString();
    await supabase.from('agent_memory').upsert(
      {
        agent_id: 'scout',
        key: 'last_run',
        value: JSON.stringify({
          timestamp: now,
          found: totalFound,
          staged: totalInserted,
          searches: searchClusters.length,
          errors: errors.length,
        }),
        ttl_hours: 168,
        expires_at: new Date(Date.now() + 168 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'agent_id,key' }
    );

    console.log(`[Wang Scout] Complete. Found: ${totalFound}, Staged: ${totalInserted}, Errors: ${errors.length}`);

    // 6. Post summary to Discord
    const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1486406441970434171/_gKexHFBqO7cxp06Z1NHRVwSgvHQR-BH6_g6ALEqhRNmKMtkIGGOCneUgBPTMPzaAXOf';
    try {
      await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '🏠 Wang Scout Report',
            color: 0xF59E0B,
            fields: [
              { name: 'Searches Run', value: `${searchClusters.length}`, inline: true },
              { name: 'Properties Found', value: `${totalFound}`, inline: true },
              { name: 'Leads Staged', value: `${totalInserted}`, inline: true },
              { name: 'Errors', value: `${errors.length}`, inline: true },
            ],
            footer: { text: `Leads staged for review — Run completed at ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}` },
          }],
        }),
      });
    } catch (discordErr) {
      console.error('[Wang Scout] Discord notification failed:', discordErr);
    }

    // SMS to owner
    try {
      await notifyOwner({
        subject: 'Scout Report',
        body: `Searches: ${searchClusters.length}\nProperties found: ${totalFound}\nLeads staged: ${totalInserted}\nErrors: ${errors.length}`,
      });
    } catch (e) { console.error('[Wang Scout] Owner SMS failed:', e); }

    return new Response(
      JSON.stringify({
        success: true,
        found: totalFound,
        staged: totalInserted,
        searches: searchClusters.length,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Wang Scout] Fatal error:', error);
    const message = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
