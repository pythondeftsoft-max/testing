const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { notifyOwner } from '../_shared/notify-owner.ts';

const AGENT_ID = 'content-seo';

// Template mapping for ALL location page types
const PAGE_TYPE_CONFIG: Record<string, { template: string; contentType: string; titlePattern: string; slugPattern: string; needsCity: boolean; needsZip: boolean }> = {
  // State-level pages (Priority 0)
  section8_state: {
    template: 'section8',
    contentType: 'section8_state',
    titlePattern: 'Section 8 Housing in {state} — Complete State Guide {year}',
    slugPattern: 'section-8/{stateSlug}',
    needsCity: false,
    needsZip: false,
  },
  landlord_state: {
    template: 'landlord',
    contentType: 'landlord_state',
    titlePattern: 'Accept Section 8 Vouchers in {state} — Landlord Guide {year}',
    slugPattern: 'landlords/{stateSlug}',
    needsCity: false,
    needsZip: false,
  },
  rent_data_state: {
    template: 'rent-data',
    contentType: 'rent_data_state',
    titlePattern: '{state} Rental Market Data & Trends {year}',
    slugPattern: 'rent-data/{stateSlug}',
    needsCity: false,
    needsZip: false,
  },
  // City-level pages (Priority 1-2)
  section8_city: {
    template: 'section8',
    contentType: 'section8_city',
    titlePattern: 'Section 8 Housing in {city}, {state} — Voucher Guide {year}',
    slugPattern: 'section-8/{stateSlug}/{citySlug}',
    needsCity: true,
    needsZip: false,
  },
  landlord_city: {
    template: 'landlord',
    contentType: 'landlord_city',
    titlePattern: 'How to Accept Section 8 Vouchers in {city}, {state} — Landlord Guide {year}',
    slugPattern: 'landlords/{stateSlug}/{citySlug}',
    needsCity: true,
    needsZip: false,
  },
  rent_data_city: {
    template: 'rent-data',
    contentType: 'rent_data_city',
    titlePattern: '{city}, {state} Rental Market Data & Trends {year}',
    slugPattern: 'rent-data/{stateSlug}/{citySlug}',
    needsCity: true,
    needsZip: false,
  },
  pm_city: {
    template: 'property-management',
    contentType: 'pm_city',
    titlePattern: 'Property Management in {city}, {state} — Software & Services Guide {year}',
    slugPattern: 'property-management/{stateSlug}/{citySlug}',
    needsCity: true,
    needsZip: false,
  },
  // Zipcode-level pages (Priority 3)
  section8_zip: {
    template: 'section8',
    contentType: 'section8_city',
    titlePattern: 'Section 8 Housing Near {zipcode} in {city}, {state} {year}',
    slugPattern: 'section-8/{stateSlug}/{citySlug}/{zipcode}',
    needsCity: true,
    needsZip: true,
  },
};

// Research queries for Firecrawl by page type
const RESEARCH_QUERIES: Record<string, (city: string, state: string) => string> = {
  section8_state: (_c, state) => `Section 8 housing voucher ${state} eligibility waiting list housing authorities 2026`,
  section8_city: (city, state) => `Section 8 housing voucher ${city} ${state} eligibility waiting list 2026`,
  section8_zip: (city, state) => `Section 8 housing voucher ${city} ${state} eligibility waiting list 2026`,
  landlord_state: (_c, state) => `landlord accept Section 8 voucher ${state} housing choice voucher program benefits`,
  landlord_city: (city, state) => `landlord accept Section 8 voucher ${city} ${state} housing choice voucher program`,
  rent_data_state: (_c, state) => `${state} rental market trends average rent prices vacancy rate 2026`,
  rent_data_city: (city, state) => `${city} ${state} rental market trends average rent prices vacancy rate 2026`,
  pm_city: (city, state) => `property management ${city} ${state} software services rental management 2026`,
};

function toSlug(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function logActivity(supabase: any, action: string, detail: string) {
  await supabase.from('agent_activity_logs').insert({
    agent_id: AGENT_ID,
    action,
    detail,
    log_type: 'activity',
  });
}

async function storeMemory(supabase: any, key: string, value: string, ttlHours = 24) {
  const now = new Date();
  await supabase.from('agent_memory').upsert({
    agent_id: AGENT_ID,
    key,
    value,
    ttl_hours: ttlHours,
    expires_at: new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString(),
  }, { onConflict: 'agent_id,key' });
}

async function getConfig(supabase: any, key: string, fallback: any): Promise<any> {
  const { data } = await supabase
    .from('system_config')
    .select('config_value')
    .eq('config_key', key)
    .single();
  if (!data) return fallback;
  const v = data.config_value;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (!isNaN(Number(v))) return Number(v);
  return v;
}

async function researchWithFirecrawl(firecrawlKey: string, query: string): Promise<string> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 3,
        tbs: 'qdr:m',
        scrapeOptions: { formats: ['markdown'] },
      }),
    });

    if (!res.ok) {
      console.error(`Firecrawl search failed: ${res.status}`);
      return '';
    }

    const result = await res.json();
    const items = result.data || result.results || [];
    return items.slice(0, 3).map((item: any) => {
      const title = item.title || item.metadata?.title || 'Source';
      const markdown = (item.markdown || item.data?.markdown || '').slice(0, 2000);
      return `--- ${title} ---\n${markdown}`;
    }).join('\n\n');
  } catch (err) {
    console.error('Firecrawl research error:', err);
    return '';
  }
}

async function fetchHudData(supabaseUrl: string, serviceKey: string, city: string, state: string): Promise<any> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/hud-intelligence-engine`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: 'fmr', zip: '', city, state, bedrooms: 2 }),
    });

    if (res.ok) {
      const data = await res.json();
      return data?.data || null;
    }
  } catch (err) {
    console.error('HUD data fetch error:', err);
  }
  return null;
}

async function generateLocationPage(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  lovableApiKey: string,
  firecrawlKey: string | undefined,
  queueEntry: any
): Promise<{ success: boolean; contentId?: string; error?: string }> {
  const { state, city, zipcode, page_type } = queueEntry;
  const config = PAGE_TYPE_CONFIG[page_type];
  if (!config) {
    return { success: false, error: `Unknown page type: ${page_type}` };
  }

  // Validate required fields
  if (config.needsCity && !city) {
    return { success: false, error: `City required for ${page_type}` };
  }
  if (config.needsZip && !zipcode) {
    return { success: false, error: `Zipcode required for ${page_type}` };
  }

  const year = new Date().getFullYear();
  const title = config.titlePattern
    .replace('{city}', city || '')
    .replace('{state}', state)
    .replace('{year}', String(year))
    .replace('{zipcode}', zipcode || '');
  const slug = config.slugPattern
    .replace('{stateSlug}', toSlug(state))
    .replace('{citySlug}', toSlug(city || ''))
    .replace('{zipcode}', zipcode || '');

  // Check if content already exists with this slug
  const { data: existing } = await supabase
    .from('content')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    return { success: false, error: `Content already exists: ${slug}` };
  }

  // Research
  let researchContext = '';
  if (firecrawlKey) {
    const queryFn = RESEARCH_QUERIES[page_type];
    const query = queryFn ? queryFn(city || state, state) : `${city || ''} ${state} housing`;
    researchContext = await researchWithFirecrawl(firecrawlKey, query);
  }

  // HUD data (for section8, rent_data, and PM pages)
  let hudContext = '';
  if (['section8_city', 'section8_state', 'section8_zip', 'rent_data_city', 'rent_data_state', 'pm_city'].includes(page_type)) {
    const hudData = await fetchHudData(supabaseUrl, serviceKey, city || '', state);
    if (hudData) {
      hudContext = `\n\nHUD DATA FOR ${(city || state).toUpperCase()}, ${state.toUpperCase()}:\n${JSON.stringify(hudData, null, 2)}`;
    }
  }

  // Generate with Gemini
  const prompt = buildLocationPrompt(page_type, city || '', state, year, researchContext, hudContext, zipcode);

  const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'create_location_page',
          description: 'Create a structured location authority page',
          parameters: {
            type: 'object',
            properties: {
              meta_description: { type: 'string', description: '150-160 char meta description' },
              hero_content: { type: 'string', description: 'Introduction content (2-3 paragraphs in HTML)' },
              body_content: { type: 'string', description: 'Main body content with H2/H3 sections (HTML)' },
              faqs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    question: { type: 'string' },
                    answer: { type: 'string' },
                  },
                  required: ['question', 'answer'],
                },
              },
              neighborhoods: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                  },
                  required: ['name', 'description'],
                },
                description: 'Top 4-6 neighborhoods relevant to the page type',
              },
              stats: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string' },
                    value: { type: 'string' },
                  },
                  required: ['label', 'value'],
                },
                description: '3-4 key statistics for the location',
              },
            },
            required: ['meta_description', 'hero_content', 'body_content', 'faqs', 'neighborhoods', 'stats'],
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'create_location_page' } },
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    return { success: false, error: `AI generation failed: ${aiRes.status} - ${errText.slice(0, 200)}` };
  }

  const aiData = await aiRes.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    return { success: false, error: 'No valid tool call from AI' };
  }

  const generated = JSON.parse(toolCall.function.arguments);
  const fullContent = `${generated.hero_content}\n\n${generated.body_content}`;

  // Build schema_data
  const schemaData: any = {
    faqs: generated.faqs || [],
    neighborhoods: generated.neighborhoods || [],
    stats: generated.stats || [],
  };

  // Insert into content table
  const { data: inserted, error: insertError } = await supabase
    .from('content')
    .insert({
      title,
      slug,
      body: fullContent,
      excerpt: generated.meta_description,
      content_type: config.contentType,
      template: config.template,
      status: 'published',
      publish_date: new Date().toISOString(),
      state,
      city: city || null,
      schema_data: schemaData,
      meta_tags: {
        title: title,
        description: generated.meta_description,
        keywords: `${page_type.replace(/_/g, ' ')}, ${city || ''}, ${state}`,
      },
      language: 'en',
    })
    .select('id')
    .single();

  if (insertError) {
    return { success: false, error: `DB insert failed: ${insertError.message}` };
  }

  return { success: true, contentId: inserted.id };
}

const STRUCTURED_HTML_INSTRUCTIONS = `
IMPORTANT FORMATTING RULES — follow these exactly:
- Use proper HTML tags: <h2>, <h3>, <p>, <ul>/<ol> with <li>, <table> with <thead>/<tbody>/<tr>/<th>/<td>.
- For key statistics, wrap them in a styled callout: <div class="callout"><strong>Key Stat:</strong> ...</div>
- Use comparison tables where relevant (e.g., rent by bedroom, program requirements).
- Use numbered lists for step-by-step processes and action items.
- Use bullet lists for eligibility criteria, requirements, and feature lists.
- Bold important numbers, dollar amounts, and percentages.
- Write for the web: short paragraphs (2-3 sentences max), clear subheadings, scannable structure.
- Do NOT output markdown. Output clean HTML only.
- Do NOT include <h1> tags — the template renders the H1 separately.
- Every H2 section should be substantial (3+ paragraphs or lists).
`;

function buildLocationPrompt(pageType: string, city: string, state: string, year: number, research: string, hudData: string, zipcode?: string) {
  const locationLabel = city ? `${city}, ${state}` : state;
  const zipLabel = zipcode ? ` (ZIP ${zipcode})` : '';

  const prompts: Record<string, { system: string; user: string }> = {
    // State-level prompts
    section8_state: {
      system: `You are an expert affordable housing content writer for OpenKey. Create an authoritative statewide Section 8 housing guide for ${state}. Cover the state's housing authorities, eligibility requirements, FMR rates across regions, waiting list statuses, and major cities for voucher holders. Write in a neutral, factual tone. Mention OpenKey as a resource.\n${STRUCTURED_HTML_INSTRUCTIONS}`,
      user: `Write a comprehensive statewide Section 8 housing guide for ${state} (${year}). Cover: state housing authority overview, eligibility by region, FMR rates for top cities, waiting list tips across the state, and a city-by-city breakdown. Include comparison tables and callout boxes. ${research ? `\n\nRESEARCH CONTEXT:\n${research}` : ''}${hudData}`,
    },
    landlord_state: {
      system: `You are an expert content writer for OpenKey. Create an authoritative statewide landlord guide for accepting Section 8 vouchers in ${state}. Cover state-specific regulations, benefits, inspection requirements, and how OpenKey helps landlords find qualified tenants across ${state}.\n${STRUCTURED_HTML_INSTRUCTIONS}`,
      user: `Write a comprehensive statewide landlord guide for accepting Section 8 vouchers in ${state} (${year}). Cover: state regulations, benefits by region, inspection standards, payment standards for top cities, and tenant screening tips. Include comparison tables. ${research ? `\n\nRESEARCH CONTEXT:\n${research}` : ''}${hudData}`,
    },
    rent_data_state: {
      system: `You are a real estate data analyst writing for OpenKey. Create an authoritative statewide rental market data page for ${state}. Include rent trends by metro area, vacancy rates, affordability analysis, and what it means for tenants and landlords.\n${STRUCTURED_HTML_INSTRUCTIONS}`,
      user: `Write a comprehensive statewide rental market report for ${state} (${year}). Cover: average rent by metro, year-over-year trends, vacancy rates by region, affordability analysis, and top cities for renters. Include tables and callout boxes. ${research ? `\n\nRESEARCH CONTEXT:\n${research}` : ''}${hudData}`,
    },
    // City-level prompts
    section8_city: {
      system: `You are an expert affordable housing content writer for OpenKey. Create an authoritative Section 8 housing guide for ${locationLabel}. Include real information about the local housing authority, eligibility requirements, FMR rates, waiting list status, and neighborhoods with affordable options. Write in a neutral, factual tone. Mention OpenKey as a resource for connecting tenants with landlords who accept vouchers.\n${STRUCTURED_HTML_INSTRUCTIONS}`,
      user: `Write a comprehensive Section 8 housing guide for ${locationLabel} (${year}). Cover: eligibility, local housing authority info, waiting list tips, FMR rates, best neighborhoods for voucher holders, and FAQs. Include at least one comparison table (e.g., FMR by bedroom count) and one callout box with a key statistic. ${research ? `\n\nRESEARCH CONTEXT:\n${research}` : ''}${hudData}`,
    },
    landlord_city: {
      system: `You are an expert content writer for OpenKey. Create an authoritative landlord guide for accepting Section 8 vouchers in ${locationLabel}. Cover the benefits, inspection process, payment standards, and how OpenKey helps landlords find qualified tenants. Write in a professional, informative tone.\n${STRUCTURED_HTML_INSTRUCTIONS}`,
      user: `Write a comprehensive landlord guide for accepting Section 8 vouchers in ${locationLabel} (${year}). Cover: benefits of Section 8, how the program works, inspection requirements, payment standards, tenant screening tips, and FAQs. Include a table comparing payment standards by bedroom and a numbered list of the inspection process steps. ${research ? `\n\nRESEARCH CONTEXT:\n${research}` : ''}${hudData}`,
    },
    rent_data_city: {
      system: `You are a real estate data analyst writing for OpenKey. Create an authoritative rental market data page for ${locationLabel}. Include trends, average rents by bedroom, vacancy rates, neighborhood comparisons, and what it means for tenants and landlords. Reference real data where available.\n${STRUCTURED_HTML_INSTRUCTIONS}`,
      user: `Write a comprehensive rental market data report for ${locationLabel} (${year}). Cover: average rent by bedroom count, year-over-year trends, vacancy rates, top neighborhoods by value, affordability analysis, and FAQs. Include a rent comparison table and callout boxes for key market statistics. ${research ? `\n\nRESEARCH CONTEXT:\n${research}` : ''}${hudData}`,
    },
    pm_city: {
      system: `You are an expert property management content writer for OpenKey. Create an authoritative property management guide for ${locationLabel}. Cover local market conditions, property management software options, Section 8 voucher management, rent collection automation, maintenance coordination, and how OpenKey helps property managers fill vacancies with voucher-ready tenants.\n${STRUCTURED_HTML_INSTRUCTIONS}`,
      user: `Write a comprehensive property management guide for ${locationLabel} (${year}). Cover: local market overview, PM software comparison, Section 8 voucher management tips, rent collection best practices, maintenance automation, tenant screening, and FAQs. Include comparison tables and actionable steps. ${research ? `\n\nRESEARCH CONTEXT:\n${research}` : ''}${hudData}`,
    },
    // Zipcode-level prompts
    section8_zip: {
      system: `You are an expert affordable housing content writer for OpenKey. Create a hyper-local Section 8 housing guide for ZIP code ${zipcode} in ${locationLabel}. Focus on the specific neighborhoods, housing options, and local resources available near this zip code.\n${STRUCTURED_HTML_INSTRUCTIONS}`,
      user: `Write a focused Section 8 housing guide for ZIP ${zipcode} in ${locationLabel}${zipLabel} (${year}). Cover: nearby housing authority, local eligibility info, available housing near this zip, FMR rates, surrounding neighborhoods, and FAQs. Be specific to this zip code area. ${research ? `\n\nRESEARCH CONTEXT:\n${research}` : ''}${hudData}`,
    },
  };

  return prompts[pageType] || prompts.section8_city;
}

// Phase-balanced queue selection
async function pickNextLocation(supabase: any, todayStart: Date): Promise<any> {
  // Check how many Phase 2 (priority >= 2) pages were published today
  const { count: phase2Today } = await supabase
    .from('seo_location_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('priority', 2)
    .gte('updated_at', todayStart.toISOString());

  const phase2Count = phase2Today || 0;

  // If no Phase 2 pages today, force a Phase 2 pick
  if (phase2Count === 0) {
    const { data: phase2Location } = await supabase
      .from('seo_location_queue')
      .select('*')
      .eq('status', 'pending')
      .gte('priority', 2)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (phase2Location) {
      console.log(`Phase balancing: forcing Phase 2 pick (${phase2Location.city}, ${phase2Location.state})`);
      return phase2Location;
    }
  }

  // Normal pick: priority ASC
  const { data: nextLocation } = await supabase
    .from('seo_location_queue')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  return nextLocation || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Step 1: Check daily quota
    const dailyTarget = await getConfig(supabase, 'seo_daily_post_target', 5);
    const minHours = await getConfig(supabase, 'seo_min_hours_between_posts', 2);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Count today's content posts
    const { count: contentToday } = await supabase
      .from('content')
      .select('id', { count: 'exact', head: true })
      .gte('publish_date', todayStart.toISOString())
      .eq('status', 'published');

    // Count today's blog posts
    const { count: blogToday } = await supabase
      .from('blog_posts')
      .select('id', { count: 'exact', head: true })
      .gte('published_at', todayStart.toISOString())
      .eq('status', 'published');

    const totalToday = (contentToday || 0) + (blogToday || 0);

    if (totalToday >= dailyTarget) {
      console.log(`Daily target met: ${totalToday}/${dailyTarget}`);
      await logActivity(supabase, 'Quota check', `Daily target met (${totalToday}/${dailyTarget}), skipping`);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'Daily target met', count: totalToday }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check min hours since last post
    const { data: lastPost } = await supabase
      .from('blog_generation_logs')
      .select('completed_at')
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (lastPost?.completed_at) {
      const hoursSince = (Date.now() - new Date(lastPost.completed_at).getTime()) / (1000 * 60 * 60);
      if (hoursSince < minHours) {
        console.log(`Too soon: ${hoursSince.toFixed(1)}h since last post, need ${minHours}h`);
        return new Response(JSON.stringify({ success: true, skipped: true, reason: `Too soon (${hoursSince.toFixed(1)}h)` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Step 2: Decide mode — location page or blog post
    const { count: locationPagesToday } = await supabase
      .from('seo_location_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('updated_at', todayStart.toISOString());

    const blogPostsToday = (blogToday || 0);
    const locationPageCount = locationPagesToday || 0;

    // Alternate: if fewer location pages than blog posts, do location; otherwise blog
    const doLocationPage = locationPageCount <= blogPostsToday;

    console.log(`Mode decision: location=${locationPageCount}, blogs=${blogPostsToday}, doing ${doLocationPage ? 'location' : 'blog'}`);

    if (doLocationPage) {
      // === LOCATION PAGE PATH (with phase balancing) ===
      const nextLocation = await pickNextLocation(supabase, todayStart);

      if (!nextLocation) {
        console.log('No pending locations, falling back to blog post');
        // Fall through to blog post
      } else {
        // Mark as in_progress
        await supabase
          .from('seo_location_queue')
          .update({ status: 'in_progress' })
          .eq('id', nextLocation.id);

        const result = await generateLocationPage(
          supabase, supabaseUrl, supabaseKey, lovableApiKey, firecrawlKey, nextLocation
        );

        if (result.success) {
          await supabase
            .from('seo_location_queue')
            .update({
              status: 'published',
              published_content_id: result.contentId,
            })
            .eq('id', nextLocation.id);

          await logActivity(supabase, 'Location page published',
            `${nextLocation.page_type}: ${nextLocation.city || nextLocation.state}${nextLocation.zipcode ? ` (${nextLocation.zipcode})` : ''}, ${nextLocation.state}`);

          await storeMemory(supabase, `last_location_${Date.now()}`,
            JSON.stringify({
              type: nextLocation.page_type,
              city: nextLocation.city,
              state: nextLocation.state,
              zipcode: nextLocation.zipcode,
              contentId: result.contentId,
            }));

          return new Response(JSON.stringify({
            success: true,
            mode: 'location',
            city: nextLocation.city,
            state: nextLocation.state,
            pageType: nextLocation.page_type,
            contentId: result.contentId,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          await supabase
            .from('seo_location_queue')
            .update({ status: 'failed', error_message: result.error })
            .eq('id', nextLocation.id);

          await logActivity(supabase, 'Location page failed',
            `${nextLocation.city || nextLocation.state}, ${nextLocation.state}: ${result.error}`);
          // Fall through to try blog post
        }
      }
    }

    // === BLOG POST PATH ===
    let topicOverride: string | undefined;
    if (firecrawlKey) {
      const queries = [
        'Section 8 housing voucher news updates 2026',
        'rental housing market trends landlord tips 2026',
        'affordable housing policy HUD updates 2026',
        'property management software comparison 2026',
        'housing market real estate news today 2026',
      ];
      const randomQuery = queries[Math.floor(Math.random() * queries.length)];

      try {
        const searchRes = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: randomQuery, limit: 3, tbs: 'qdr:w' }),
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const items = searchData.data || searchData.results || [];
          if (items.length > 0) {
            const topItem = items[0];
            topicOverride = topItem.title || topItem.metadata?.title;
            await storeMemory(supabase, `research_${Date.now()}`,
              JSON.stringify({
                query: randomQuery,
                results: items.slice(0, 3).map((i: any) => ({
                  title: i.title || i.metadata?.title,
                  url: i.url || i.metadata?.sourceURL,
                })),
              }));
          }
        }
      } catch (err) {
        console.error('Research error:', err);
      }
    }

    // Call generate-seo-blog-post
    const genUrl = `${supabaseUrl}/functions/v1/generate-seo-blog-post`;
    const genBody: any = { source: 'agent-content-poster' };
    if (topicOverride) genBody.topic_override = topicOverride;

    const genRes = await fetch(genUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(genBody),
    });

    const genData = await genRes.json();

    if (genData.success) {
      await logActivity(supabase, 'Blog post published',
        `Pillar rotation, topic: ${topicOverride || 'auto-selected'}`);

      // Per-post SMS removed — daily digest via blog-digest-sms handles notifications

      return new Response(JSON.stringify({
        success: true,
        mode: 'blog',
        topic: topicOverride || 'auto-selected',
        postId: genData.post_id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      await logActivity(supabase, 'Blog post failed',
        genData.reason || genData.error || 'Unknown error');

      return new Response(JSON.stringify({
        success: false,
        error: genData.error || genData.reason || 'Blog generation failed',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Agent content poster error:', error);
    await logActivity(supabase, 'Error', (error instanceof Error ? error.message : String(error))).catch(() => {});

    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
