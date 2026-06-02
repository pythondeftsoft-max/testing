// Auto-fetch HUD HCV Administrative Fee Rates and upsert into hud_admin_fee_rates.
// HUD publishes the schedule yearly as an .xlsx at a stable PIH-Notice URL.
// The URL is configurable via system_config('hud_admin_fee_rates_url') so it can
// be updated without a code change when HUD publishes a new CY.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_URL =
  'https://www.hud.gov/sites/default/files/PIH/documents/CY_2025_Administrative_Fee_Rates.xlsx';
const DEFAULT_YEAR = 2025;

// HUD serves the same file from two equivalent paths; if one 404s, retry the other.
function altUrl(u: string): string | null {
  if (u.includes('/sites/default/files/')) return u.replace('/sites/default/files/', '/sites/dfiles/');
  if (u.includes('/sites/dfiles/')) return u.replace('/sites/dfiles/', '/sites/default/files/');
  return null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function pickKey(row: Record<string, unknown>, candidates: string[]): unknown {
  // Case-insensitive header lookup
  const map: Record<string, string> = {};
  for (const k of Object.keys(row)) map[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = k;
  for (const c of candidates) {
    const norm = c.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (map[norm]) return row[map[norm]];
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Parse body once
    const body = await req.json().catch(() => ({} as any));

    // ---- Single-PHA mode: cheap lookup against the already-loaded HUD table ----
    // No HUD download. Just check if this PHA's code is in hud_admin_fee_rates,
    // and if so, copy col_a / col_b into pha_enrichment so the wallet flips
    // from "Fallback" to "Official HUD" without re-pulling 2,000+ rows.
    if (body?.mode === 'single' && typeof body?.pha_code === 'string') {
      const pha = body.pha_code.trim().toUpperCase();
      if (!pha) {
        return new Response(JSON.stringify({ success: false, error: 'pha_code required' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: rate } = await supabase
        .from('hud_admin_fee_rates')
        .select('pha_code, col_a_rate, col_b_rate, fmr_area, effective_date')
        .eq('pha_code', pha)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!rate) {
        return new Response(JSON.stringify({
          success: true,
          matched: false,
          pha_code: pha,
          message: `PHA code ${pha} is not in HUD's admin-fee schedule. This usually means the PHA is too small to be listed, recently merged, or HUD uses a different code. Quote will keep using the $85/unit/mo fallback — use "Edit" to set a manual quote.`,
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Upsert into pha_enrichment so the wallet picks up official rates
      const { error: upErr } = await supabase
        .from('pha_enrichment')
        .upsert({
          pha_code: pha,
          admin_fee_col_a: rate.col_a_rate,
          admin_fee_col_b: rate.col_b_rate,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'pha_code' });
      if (upErr) {
        return new Response(JSON.stringify({ success: false, error: upErr.message }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({
        success: true,
        matched: true,
        pha_code: pha,
        col_a: rate.col_a_rate,
        col_b: rate.col_b_rate,
        fmr_area: rate.fmr_area,
        effective_date: rate.effective_date,
        message: `Official HUD rate applied: Col A $${rate.col_a_rate}/unit/mo${rate.col_b_rate ? ` + Col B $${rate.col_b_rate}` : ''} (effective ${rate.effective_date}).`,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ---- Global sync mode (default) ----
    let url = DEFAULT_URL;
    let year = DEFAULT_YEAR;
    let overrideUrl: string | null = null;
    if (body?.url && typeof body.url === 'string') overrideUrl = body.url;
    if (body?.year && typeof body.year === 'number') year = body.year;

    if (!overrideUrl) {
      const { data: cfg } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'hud_admin_fee_rates_url')
        .maybeSingle();
      const cfgVal = (cfg?.config_value ?? null) as { url?: string; year?: number } | null;
      if (cfgVal?.url) url = cfgVal.url;
      if (cfgVal?.year) year = cfgVal.year;
    } else {
      url = overrideUrl;
    }

    // Download workbook (with alt-host retry on 404)
    let res = await fetch(url, {
      headers: { 'User-Agent': 'OpenKeyHousing/1.0 (HUD admin fee sync)' },
    });
    let usedUrl = url;
    if (!res.ok && res.status === 404) {
      const alt = altUrl(url);
      if (alt) {
        const retry = await fetch(alt, {
          headers: { 'User-Agent': 'OpenKeyHousing/1.0 (HUD admin fee sync)' },
        });
        if (retry.ok) { res = retry; usedUrl = alt; }
      }
    }
    if (!res.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: `HUD download failed (${res.status}) at ${url}. HUD may have renamed the file. Update the URL in system_config('hud_admin_fee_rates_url') or use the manual CSV importer.`,
        url,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return new Response(JSON.stringify({ success: false, error: 'Workbook has no sheets' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Sheet is empty' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const effDate = `${year}-01-01`;
    const upsertRows: Array<{ pha_code: string; fmr_area: string | null; col_a_rate: number | null; col_b_rate: number | null; effective_date: string; source_url: string }> = [];
    let skipped = 0;

    for (const r of rows) {
      const phaRaw = pickKey(r, ['PHA Num', 'PHA Number', 'PHA Code', 'pha_code', 'PHACode', 'PHANum', 'PHA', 'Agency Code', 'HUD Code', 'pha']);
      const pha = phaRaw ? String(phaRaw).trim().toUpperCase() : '';
      if (!pha || !/^[A-Z]{2}\d+/.test(pha)) { skipped++; continue; }
      const colA = num(pickKey(r, ['Col A Rate', 'Column A Rate', 'col_a', 'Col A', 'A Rate', 'Admin Fee A']));
      const colB = num(pickKey(r, ['Col B Rate', 'Column B Rate', 'col_b', 'Col B', 'B Rate', 'Admin Fee B']));
      const fmr = pickKey(r, ['FMR Area', 'Area', 'FMR', 'Area Name']);
      if (colA === null && colB === null) { skipped++; continue; }
      upsertRows.push({
        pha_code: pha,
        fmr_area: fmr ? String(fmr).trim() : null,
        col_a_rate: colA,
        col_b_rate: colB,
        effective_date: effDate,
        source_url: usedUrl,
      });
    }

    if (upsertRows.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: `Parsed ${rows.length} rows but found no recognizable PHA / fee columns. Sheet headers may have changed — sample: ${Object.keys(rows[0]).slice(0, 6).join(', ')}.`,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Match against active HUD roster (paginated)
    const allPhas = new Set<string>();
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('housing_authorities')
        .select('pha_code')
        .eq('registry_status', 'active_hud')
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      data.forEach(r => r.pha_code && allPhas.add(r.pha_code.toUpperCase()));
      if (data.length < PAGE) break;
      from += PAGE;
    }

    const matched = upsertRows.filter(r => allPhas.has(r.pha_code)).length;
    const unmatched = upsertRows.length - matched;

    // Bulk upsert
    const CHUNK = 500;
    let inserted = 0;
    for (let i = 0; i < upsertRows.length; i += CHUNK) {
      const slice = upsertRows.slice(i, i + CHUNK);
      const { error } = await supabase
        .from('hud_admin_fee_rates')
        .upsert(slice, { onConflict: 'pha_code,effective_date' });
      if (error) throw error;
      inserted += slice.length;
    }

    return new Response(JSON.stringify({
      success: true,
      url: usedUrl,
      year,
      total_rows: rows.length,
      inserted,
      matched,
      unmatched,
      skipped,
      message: `Synced CY${year} HUD admin fee schedule. ${inserted} rates loaded, ${matched} matched to active PHAs (${unmatched} unmatched). Wallets recompute on next "Re-enrich".`,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
