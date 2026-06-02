// Daily anomaly scan over pii_access_log + eiv_access_log.
// Auto-creates draft security_incidents when an actor exceeds reveal thresholds.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PII_DAILY_THRESHOLD = 25;   // > N PII reveals in 24h by one actor → flag
const EIV_DAILY_THRESHOLD = 50;   // > N EIV views in 24h by one actor → flag

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const created: string[] = [];

  try {
    // --- PII access anomalies ---
    const { data: piiRows } = await supabase
      .from('pii_access_log')
      .select('accessed_by')
      .gte('accessed_at', since);

    const piiCounts = new Map<string, number>();
    (piiRows ?? []).forEach((r: any) => {
      if (!r.accessed_by) return;
      piiCounts.set(r.accessed_by, (piiCounts.get(r.accessed_by) ?? 0) + 1);
    });

    for (const [actor, count] of piiCounts.entries()) {
      if (count <= PII_DAILY_THRESHOLD) continue;
      // Skip if a draft incident already exists for this actor in last 24h
      const { data: existing } = await supabase
        .from('security_incidents')
        .select('id')
        .gte('discovered_at', since)
        .ilike('description', `%${actor}%`)
        .limit(1);
      if (existing && existing.length) continue;

      const { data: incident } = await supabase
        .from('security_incidents')
        .insert({
          severity: 'medium',
          discovered_at: new Date().toISOString(),
          pii_exposed: true,
          description: `Anomaly: actor ${actor} performed ${count} PII reveals in 24h (threshold ${PII_DAILY_THRESHOLD}). Auto-flagged for review.`,
          remediation: 'Review pii_access_log entries for this actor. Confirm legitimate purpose or revoke access.',
          status: 'open',
        })
        .select('id')
        .single();
      if (incident) created.push(incident.id);
    }

    // --- EIV access anomalies ---
    const { data: eivRows } = await supabase
      .from('eiv_access_log')
      .select('accessed_by')
      .gte('accessed_at', since);

    const eivCounts = new Map<string, number>();
    (eivRows ?? []).forEach((r: any) => {
      if (!r.accessed_by) return;
      eivCounts.set(r.accessed_by, (eivCounts.get(r.accessed_by) ?? 0) + 1);
    });

    for (const [actor, count] of eivCounts.entries()) {
      if (count <= EIV_DAILY_THRESHOLD) continue;
      const { data: existing } = await supabase
        .from('security_incidents')
        .select('id')
        .gte('discovered_at', since)
        .ilike('description', `%EIV anomaly ${actor}%`)
        .limit(1);
      if (existing && existing.length) continue;

      const { data: incident } = await supabase
        .from('security_incidents')
        .insert({
          severity: 'medium',
          discovered_at: new Date().toISOString(),
          pii_exposed: true,
          description: `EIV anomaly ${actor}: ${count} EIV-derived field views in 24h (threshold ${EIV_DAILY_THRESHOLD}).`,
          remediation: 'Review eiv_access_log; confirm EIV use restrictions per HUD §5.214.',
          status: 'open',
        })
        .select('id')
        .single();
      if (incident) created.push(incident.id);
    }

    return new Response(
      JSON.stringify({ success: true, incidents_created: created.length, ids: created }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e?.message ?? 'unknown' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  }
});
