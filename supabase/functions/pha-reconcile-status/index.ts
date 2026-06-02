// supabase/functions/pha-reconcile-status/index.ts
// Reconciles every housing_authorities row against HUD's live ArcGIS roster
// and labels each row's `registry_status` accordingly:
//   - active_hud : code IS in current HUD feed
//   - stale_hud  : code matches XX### format but NOT in current HUD feed
//   - manual     : metadata.source = 'manual_admin_add'
//   - unknown    : everything else (non-conforming codes, etc.)
//
// Admin-gated. Returns counts grouped by status.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HUD_PHA_URL =
  'https://services.arcgis.com/VTyQ9soqVukalItT/ArcGIS/rest/services/Public_Housing_Authorities/FeatureServer/0/query';

const PHA_CODE_RE = /^[A-Z]{2}[0-9]{3,4}$/;

async function fetchHudCodes(): Promise<Set<string>> {
  const out = new Set<string>();
  let offset = 0;
  const PAGE = 2000;
  for (let i = 0; i < 10; i++) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: 'PARTICIPANT_CODE',
      f: 'json',
      returnGeometry: 'false',
      resultOffset: String(offset),
      resultRecordCount: String(PAGE),
    });
    const res = await fetch(`${HUD_PHA_URL}?${params}`);
    if (!res.ok) break;
    const json = await res.json();
    const features = json.features ?? [];
    if (features.length === 0) break;
    for (const f of features) {
      const code = f.attributes?.PARTICIPANT_CODE;
      if (code) out.add(String(code).trim().toUpperCase());
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

    // Admin gate — caller must have admin role
    const authHeader = req.headers.get('Authorization') ?? '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userRes } = await userClient.auth.getUser(token);
      if (!userRes?.user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Not authenticated' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const { data: isAdmin } = await admin.rpc('is_admin', { user_id: userRes.user.id });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ success: false, error: 'Admin only' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // 1. Pull HUD codes
    const hudCodes = await fetchHudCodes();
    if (hudCodes.size === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'HUD roster fetch returned 0 records' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Pull every row in housing_authorities (paginated)
    const rows: Array<{ id: string; pha_code: string | null; metadata: any }> = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await admin
        .from('housing_authorities')
        .select('id, pha_code, metadata')
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      rows.push(...(data as any[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }

    // 3. Categorize and build per-bucket id arrays
    const buckets = {
      active_hud: [] as string[],
      stale_hud: [] as string[],
      manual: [] as string[],
      unknown: [] as string[],
    };
    for (const r of rows) {
      const code = (r.pha_code ?? '').toString().trim().toUpperCase();
      const source = r.metadata?.source;
      if (source === 'manual_admin_add') {
        buckets.manual.push(r.id);
      } else if (code && hudCodes.has(code)) {
        buckets.active_hud.push(r.id);
      } else if (code && PHA_CODE_RE.test(code)) {
        buckets.stale_hud.push(r.id);
      } else {
        buckets.unknown.push(r.id);
      }
    }

    // 4. Bulk update each bucket (chunked to keep payloads sensible)
    let updated = 0;
    for (const [status, ids] of Object.entries(buckets)) {
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        const { error } = await admin
          .from('housing_authorities')
          .update({ registry_status: status })
          .in('id', chunk);
        if (error) {
          console.error('reconcile update failed', status, error.message);
        } else {
          updated += chunk.length;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        hud_total: hudCodes.size,
        our_total: rows.length,
        active_hud: buckets.active_hud.length,
        stale_hud: buckets.stale_hud.length,
        manual: buckets.manual.length,
        unknown: buckets.unknown.length,
        rows_updated: updated,
        checked_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error(e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message ?? String(e) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
