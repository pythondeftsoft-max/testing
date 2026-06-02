// supabase/functions/import-hud-admin-fees/index.ts
// Bulk-imports HUD HCV admin-fee rates (Column A per-unit-month, Column B annual)
// into hud_admin_fee_rates. HUD publishes this schedule yearly at:
//   https://www.hud.gov/program_offices/public_indian_housing/programs/hcv/landlord/admfeerates
//
// Two ingestion modes:
//   1. { csv_url: "https://..."  } — fetch a CSV the admin links to
//   2. { csv: "PHA_CODE,COL_A,COL_B\n..." } — paste raw CSV body
//
// The CSV must have columns: pha_code, col_a (or col_a_rate), col_b (or col_b_rate),
// and optionally effective_date (defaults to today).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseCsv(csv: string): Array<Record<string, string>> {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    // Simple CSV split — admin fee schedules don't have quoted commas.
    const cells = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

function pickNumber(row: Record<string, string>, keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k];
    if (!v) continue;
    const n = parseFloat(v.replace(/[$,]/g, ''));
    if (!isNaN(n) && n > 0) return n;
  }
  return null;
}

function pickStr(row: Record<string, string>, keys: string[]): string | null {
  for (const k of keys) {
    if (row[k] && row[k].trim()) return row[k].trim();
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
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
  const r1 = await admin.rpc('is_admin', { user_id: userRes.user.id });
  if (r1.data === true) isAdmin = true;
  else {
    const r2 = await admin.rpc('is_admin', { _user_id: userRes.user.id });
    if (r2.data === true) isAdmin = true;
  }
  if (!isAdmin) {
    return new Response(JSON.stringify({ success: false, error: 'Admin access required' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}
  const { csv_url, csv } = body;

  let csvText = '';
  let source = 'pasted';
  if (csv_url) {
    try {
      const res = await fetch(csv_url);
      if (!res.ok) {
        return new Response(JSON.stringify({ success: false, error: `Failed to fetch CSV: ${res.status}` }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      csvText = await res.text();
      source = csv_url;
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: `Fetch error: ${e.message}` }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } else if (typeof csv === 'string' && csv.length > 0) {
    csvText = csv;
  } else {
    return new Response(JSON.stringify({
      success: false,
      error: 'Provide either csv_url or csv body. Required CSV columns: pha_code, col_a, col_b. Optional: effective_date.',
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'No data rows found in CSV.' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const upserts: Array<{ pha_code: string; col_a_rate: number | null; col_b_rate: number | null; effective_date: string }> = [];
  const skipped: Array<{ row: number; reason: string }> = [];

  rows.forEach((r, idx) => {
    const code = pickStr(r, ['pha_code', 'phacode', 'pha', 'participant_code', 'code']);
    if (!code) {
      skipped.push({ row: idx + 2, reason: 'Missing pha_code' });
      return;
    }
    const colA = pickNumber(r, ['col_a_rate', 'col_a', 'cola', 'column_a', 'pum', 'column_a_rate']);
    const colB = pickNumber(r, ['col_b_rate', 'col_b', 'colb', 'column_b', 'column_b_rate']);
    if (colA == null && colB == null) {
      skipped.push({ row: idx + 2, reason: 'No fee columns found' });
      return;
    }
    const effDate = pickStr(r, ['effective_date', 'eff_date', 'date']) ?? today;
    upserts.push({
      pha_code: code.toUpperCase(),
      col_a_rate: colA,
      col_b_rate: colB,
      effective_date: effDate,
    });
  });

  // Bulk insert in chunks of 500
  let inserted = 0;
  const errors: any[] = [];
  for (let i = 0; i < upserts.length; i += 500) {
    const chunk = upserts.slice(i, i + 500);
    const { error } = await admin
      .from('hud_admin_fee_rates')
      .upsert(chunk, { onConflict: 'pha_code,effective_date' });
    if (error) errors.push(error.message);
    else inserted += chunk.length;
  }

  return new Response(JSON.stringify({
    success: true,
    source,
    rows_parsed: rows.length,
    rows_upserted: inserted,
    rows_skipped: skipped.length,
    errors,
    skipped_sample: skipped.slice(0, 10),
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
