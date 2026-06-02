import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        out.push(cur); cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };
  const headers = splitLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  return lines.slice(1).map(line => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
}

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v && v.trim()) return v.trim();
  }
  return '';
}

function num(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[$,\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { csv, effective_date } = await req.json();
    if (!csv || typeof csv !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'csv string required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rows = parseCsv(csv);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'CSV is empty or unparseable' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Build rows for upsert
    const effDate = effective_date || new Date().toISOString().slice(0, 10);
    const upsertRows: Array<{ pha_code: string; fmr_area: string | null; col_a_rate: number | null; col_b_rate: number | null; effective_date: string; source_url: string }> = [];
    let skipped = 0;

    for (const r of rows) {
      const pha = pick(r, ['pha_code', 'phacode', 'pha', 'agency_code', 'hud_code']).toUpperCase();
      if (!pha) { skipped++; continue; }
      const colA = num(pick(r, ['col_a_rate', 'col_a', 'cola', 'column_a', 'colarate', 'admin_fee_a']));
      const colB = num(pick(r, ['col_b_rate', 'col_b', 'colb', 'column_b', 'colbrate', 'admin_fee_b']));
      const fmr = pick(r, ['fmr_area', 'fmrarea', 'area', 'fmr']);
      if (colA === null && colB === null) { skipped++; continue; }
      upsertRows.push({
        pha_code: pha,
        fmr_area: fmr || null,
        col_a_rate: colA,
        col_b_rate: colB,
        effective_date: effDate,
        source_url: 'HUD Admin Fee Schedule (manual upload)',
      });
    }

    if (upsertRows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No valid rows found. Need columns: pha_code, col_a_rate, col_b_rate.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get distinct active HUD pha_codes for matching stats
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

    // Bulk upsert in chunks
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
      total_rows: rows.length,
      inserted,
      matched,
      unmatched,
      skipped,
      message: `Imported ${inserted} admin-fee rates. Matched ${matched} active PHAs (${unmatched} not in HUD active roster). Re-run "Re-enrich" to apply official wallet bands.`,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
