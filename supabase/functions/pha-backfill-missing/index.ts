// Single-purpose: insert any HUD ArcGIS PHAs that aren't yet in housing_authorities.
// No enrichment, no chunking, no resume logic — just inserts.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const HUD_PHA_URL =
  'https://services.arcgis.com/VTyQ9soqVukalItT/ArcGIS/rest/services/Public_Housing_Authorities/FeatureServer/0/query';

async function fetchHudPhas(): Promise<Map<string, any>> {
  const out = new Map<string, any>();
  let offset = 0;
  while (true) {
    const url = new URL(HUD_PHA_URL);
    url.searchParams.set('where', '1=1');
    url.searchParams.set(
      'outFields',
      'PARTICIPANT_CODE,FORMAL_PARTICIPANT_NAME,STD_ST,STD_CITY,STD_ZIP5,HA_PHN_NUM,HA_EMAIL_ADDR_TEXT,TOTAL_DWELLING_UNITS,HA_PROGRAM_TYPE',
    );
    url.searchParams.set('outSR', '4326');
    url.searchParams.set('f', 'json');
    url.searchParams.set('resultOffset', String(offset));
    url.searchParams.set('resultRecordCount', '2000');
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HUD ArcGIS HTTP ${res.status}`);
    const json = await res.json();
    const feats: any[] = json.features ?? [];
    if (feats.length === 0) break;
    for (const f of feats) {
      const a = f.attributes ?? {};
      const code = String(a.PARTICIPANT_CODE ?? '').trim().toUpperCase();
      if (!code) continue;
      if (!out.has(code)) out.set(code, a);
    }
    if (feats.length < 2000) break;
    offset += feats.length;
    if (offset > 20000) break; // hard safety
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  if (!userRes?.user) {
    return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  let isAdmin = false;
  {
    const r1 = await admin.rpc('is_admin', { user_id: userRes.user.id });
    if (r1.data === true) isAdmin = true;
    else {
      const r2 = await admin.rpc('is_admin', { _user_id: userRes.user.id });
      if (r2.data === true) isAdmin = true;
    }
  }
  if (!isAdmin) {
    return new Response(
      JSON.stringify({ success: false, error: 'Admin access required' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // 1. Build set of existing pha_codes
    const existing = new Set<string>();
    let from = 0;
    while (true) {
      const { data, error } = await admin
        .from('housing_authorities')
        .select('pha_code')
        .range(from, from + 999);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const r of data) {
        const c = String((r as any).pha_code ?? '').trim().toUpperCase();
        if (c) existing.add(c);
      }
      if (data.length < 1000) break;
      from += 1000;
    }

    // 2. Fetch HUD roster
    const hud = await fetchHudPhas();

    // 3. Build inserts for missing
    const rows: any[] = [];
    for (const [code, a] of hud.entries()) {
      if (existing.has(code)) continue;
      const name =
        (typeof a.FORMAL_PARTICIPANT_NAME === 'string' && a.FORMAL_PARTICIPANT_NAME.trim()) ||
        `PHA ${code}`;
      const city = typeof a.STD_CITY === 'string' ? a.STD_CITY.trim() : null;
      const state = typeof a.STD_ST === 'string' ? a.STD_ST.trim() : null;
      const zip = typeof a.STD_ZIP5 === 'string' ? a.STD_ZIP5.trim() : null;
      const phone = typeof a.HA_PHN_NUM === 'string' ? a.HA_PHN_NUM.trim() : null;
      const email = typeof a.HA_EMAIL_ADDR_TEXT === 'string' ? a.HA_EMAIL_ADDR_TEXT.trim() : null;
      const totalUnits =
        typeof a.TOTAL_DWELLING_UNITS === 'number' ? a.TOTAL_DWELLING_UNITS : null;
      const programType = typeof a.HA_PROGRAM_TYPE === 'string' ? a.HA_PROGRAM_TYPE.trim() : null;
      const slug = `${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')}-${code.toLowerCase()}`.slice(0, 80);
      rows.push({
        pha_code: code,
        name,
        slug,
        city,
        state,
        zip,
        phone,
        email,
        is_onboarded: false,
        metadata: {
          zip,
          total_units: totalUnits,
          program_type: programType,
          source: 'hud_arcgis_backfill',
          backfilled_at: new Date().toISOString(),
        },
      });
    }

    // 4. Insert in chunks
    let inserted = 0;
    const errors: any[] = [];
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { data, error } = await admin
        .from('housing_authorities')
        .insert(chunk)
        .select('id');
      if (error) {
        errors.push({ chunk_start: i, error: error.message });
      } else if (data) {
        inserted += data.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        hud_total: hud.size,
        existing_total: existing.size,
        candidates: rows.length,
        inserted,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message ?? String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
