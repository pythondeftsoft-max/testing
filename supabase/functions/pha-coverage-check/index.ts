// supabase/functions/pha-coverage-check/index.ts
// Compares our housing_authorities count against HUD ArcGIS roster.
// Returns total, missing PHAs, per-state breakdown. Caches result for 1 hour.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HUD_PHA_URL =
  'https://services.arcgis.com/VTyQ9soqVukalItT/ArcGIS/rest/services/Public_Housing_Authorities/FeatureServer/0/query';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface HudPha {
  code: string;
  name: string;
  state: string;
}

async function fetchHudPhasLite(): Promise<HudPha[]> {
  const out: HudPha[] = [];
  let offset = 0;
  const PAGE = 2000;
  for (let i = 0; i < 10; i++) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: 'PARTICIPANT_CODE,FORMAL_PARTICIPANT_NAME,STD_ST',
      f: 'json',
      returnGeometry: 'false',
      resultOffset: String(offset),
      resultRecordCount: String(PAGE),
    });
    const res = await fetch(`${HUD_PHA_URL}?${params}`);
    if (!res.ok) {
      console.error('HUD fetch failed', res.status);
      break;
    }
    const json = await res.json();
    const features = json.features ?? [];
    if (features.length === 0) break;
    for (const f of features) {
      const a = f.attributes ?? {};
      const code = a.PARTICIPANT_CODE;
      if (!code) continue;
      out.push({
        code: String(code).trim().toUpperCase(),
        name: String(a.FORMAL_PARTICIPANT_NAME ?? '').trim(),
        state: String(a.STD_ST ?? '').trim().toUpperCase(),
      });
    }
    if (features.length < PAGE) break;
    offset += features.length;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const url = new URL(req.url);
    let force = url.searchParams.get('force') === '1';
    if (!force && req.method === 'POST') {
      try {
        const body = await req.json();
        if (body?.force) force = true;
      } catch { /* no body */ }
    }

    // Check cache
    if (!force) {
      const { data: cached } = await admin
        .from('pha_coverage_snapshots')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached && Date.now() - new Date(cached.checked_at).getTime() < CACHE_TTL_MS) {
        return new Response(
          JSON.stringify({ success: true, cached: true, snapshot: cached }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Fetch HUD roster
    const hud = await fetchHudPhasLite();
    if (hud.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'HUD roster fetch returned 0 records' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch our roster (paginated to bypass 1000-row limit)
    const ours = new Map<string, { state: string | null }>();
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await admin
        .from('housing_authorities')
        .select('pha_code, state')
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const r of data) {
        if (r.pha_code) ours.set(String(r.pha_code).trim().toUpperCase(), { state: r.state });
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }

    // Compute missing
    const missing: HudPha[] = [];
    for (const h of hud) {
      if (!ours.has(h.code)) missing.push(h);
    }

    // Per-state breakdown
    const stateMap = new Map<string, { hud: number; ours: number }>();
    for (const h of hud) {
      const s = h.state || '??';
      const e = stateMap.get(s) ?? { hud: 0, ours: 0 };
      e.hud += 1;
      stateMap.set(s, e);
    }
    for (const [, v] of ours) {
      const s = (v.state ?? '??').toUpperCase();
      const e = stateMap.get(s) ?? { hud: 0, ours: 0 };
      e.ours += 1;
      stateMap.set(s, e);
    }
    const byState = Array.from(stateMap.entries())
      .map(([state, v]) => ({ state, hud: v.hud, ours: v.ours, gap: v.hud - v.ours }))
      .sort((a, b) => b.gap - a.gap);

    const snapshot = {
      hud_total: hud.length,
      our_total: ours.size,
      missing: missing.slice(0, 1000), // cap stored payload
      by_state: byState,
      checked_at: new Date().toISOString(),
    };

    const { data: inserted } = await admin
      .from('pha_coverage_snapshots')
      .insert(snapshot)
      .select()
      .single();

    return new Response(
      JSON.stringify({ success: true, cached: false, snapshot: inserted ?? snapshot }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error(e);
    return new Response(
      JSON.stringify({ success: false, error: e.message ?? String(e) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
