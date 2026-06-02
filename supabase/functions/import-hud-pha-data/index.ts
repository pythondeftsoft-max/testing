import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const splitRow = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = splitRow(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
  return lines.slice(1).map((line) => {
    const vals = splitRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (vals[i] ?? '').trim()));
    return row;
  });
}

function pick(row: Record<string, string>, keys: string[]): string | null {
  for (const k of keys) {
    if (row[k] != null && row[k] !== '') return row[k];
  }
  return null;
}

function num(v: string | null): number | null {
  if (v == null) return null;
  const cleaned = v.replace(/[,$\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function bool(v: string | null): boolean {
  if (!v) return false;
  const s = v.toString().toLowerCase().trim();
  return s === 'true' || s === 'yes' || s === 'y' || s === '1' || s === 'mtw';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdminData } = await admin.rpc('is_admin', { _user_id: userData.user.id });
    if (!isAdminData) {
      return new Response(JSON.stringify({ success: false, error: 'Admin only' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const csv: string = body?.csv ?? '';
    if (!csv || typeof csv !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'csv field required' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = parseCsv(csv);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No rows in CSV' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all authorities for matching by pha_code (paginated for safety)
    const all: { id: string; pha_code: string | null; metadata: any }[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await admin
        .from('housing_authorities')
        .select('id, pha_code, metadata')
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    const byCode = new Map(all.filter((a) => a.pha_code).map((a) => [a.pha_code!.toUpperCase().trim(), a]));

    let matched = 0;
    let updated = 0;
    let unmatched = 0;
    const updates: { id: string; metadata: any }[] = [];

    for (const r of rows) {
      const codeRaw = pick(r, ['pha_code', 'phacode', 'code', 'pha_id', 'phaid']);
      if (!codeRaw) {
        unmatched++;
        continue;
      }
      const code = codeRaw.toUpperCase().trim();
      const auth = byCode.get(code);
      if (!auth) {
        unmatched++;
        continue;
      }
      matched++;

      const voucher_count = num(pick(r, ['vouchers', 'total_units', 'hcv_units', 'voucher_count', 'units']));
      const semap_score = pick(r, ['semap_score', 'semap', 'designation', 'performance']);
      const mtw = bool(pick(r, ['mtw', 'is_mtw', 'mtw_status']));
      const ed_name = pick(r, ['ed_name', 'executive_director', 'director', 'ceo', 'contact_name']);
      const ed_email = pick(r, ['ed_email', 'director_email', 'contact_email', 'email']);
      const ed_phone = pick(r, ['ed_phone', 'director_phone', 'contact_phone', 'phone']);

      const next: Record<string, any> = { ...(auth.metadata ?? {}) };
      let changed = false;
      if (voucher_count != null && next.voucher_count !== voucher_count) {
        next.voucher_count = voucher_count;
        changed = true;
      }
      if (semap_score && next.semap_score !== semap_score) {
        next.semap_score = semap_score;
        changed = true;
      }
      if (mtw && next.mtw !== true) {
        next.mtw = true;
        changed = true;
      }
      if (ed_name && next.ed_name !== ed_name) {
        next.ed_name = ed_name;
        changed = true;
      }
      if (ed_email && next.ed_email !== ed_email) {
        next.ed_email = ed_email;
        changed = true;
      }
      if (ed_phone && next.ed_phone !== ed_phone) {
        next.ed_phone = ed_phone;
        changed = true;
      }

      if (changed) {
        updates.push({ id: auth.id, metadata: next });
      }
    }

    // Apply updates in chunks
    for (let i = 0; i < updates.length; i += 100) {
      const chunk = updates.slice(i, i + 100);
      for (const u of chunk) {
        const { error } = await admin
          .from('housing_authorities')
          .update({ metadata: u.metadata })
          .eq('id', u.id);
        if (!error) updated++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, matched, unmatched, updated, total_rows: rows.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message ?? String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
