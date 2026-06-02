import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// ----- AP export generators -----
function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

interface ExportRow {
  vendor_name: string;
  vendor_id: string;
  amount: number;
  period_month: string;
  memo: string;
  reference: string;
}

function generateGenericCsv(rows: ExportRow[]): string {
  const header = ['Vendor', 'VendorID', 'Amount', 'Date', 'Memo', 'Reference'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([r.vendor_name, r.vendor_id, r.amount.toFixed(2), r.period_month, r.memo, r.reference].map(csvEscape).join(','));
  }
  return lines.join('\n') + '\n';
}

function generateYardiCsv(rows: ExportRow[]): string {
  // Yardi Voyager AP import - simplified payable invoice format
  const header = ['VendorCode', 'VendorName', 'InvoiceNumber', 'InvoiceDate', 'Amount', 'Description', 'GLAccount'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([r.vendor_id, r.vendor_name, r.reference, r.period_month, r.amount.toFixed(2), r.memo, '5100-HAP'].map(csvEscape).join(','));
  }
  return lines.join('\n') + '\n';
}

function generateQuickBooksIIF(rows: ExportRow[]): string {
  // QB Desktop IIF check register format
  const lines: string[] = [
    '!ACCNT\tNAME\tACCNTTYPE',
    'ACCNT\tHAP Payments\tEXP',
    '!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO',
    '!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO',
    '!ENDTRNS',
  ];
  for (const r of rows) {
    lines.push(`TRNS\tCHECK\t${r.period_month}\tChecking\t${r.vendor_name}\t-${r.amount.toFixed(2)}\t${r.memo} ${r.reference}`);
    lines.push(`SPL\tCHECK\t${r.period_month}\tHAP Payments\t${r.vendor_name}\t${r.amount.toFixed(2)}\t${r.memo}`);
    lines.push('ENDTRNS');
  }
  return lines.join('\n') + '\n';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization') || '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ success: false, error: 'unauthorized' });

    const { batch_id } = await req.json();
    if (!batch_id) return json({ success: false, error: 'batch_id required' });

    const { data: batch, error: bErr } = await supabase
      .from('hap_payment_batches')
      .select('id, agency_id, period_month, status, batch_number')
      .eq('id', batch_id)
      .maybeSingle();
    if (bErr || !batch) return json({ success: false, error: 'batch not found' });

    const { count: existingCount } = await supabase
      .from('hap_disbursements')
      .select('*', { count: 'exact', head: true })
      .eq('batch_id', batch_id);
    if ((existingCount || 0) > 0) {
      return json({ success: false, error: 'disbursements already exist for this batch' });
    }

    const { data: settings } = await supabase
      .from('agency_payment_settings')
      .select('*')
      .eq('agency_id', batch.agency_id)
      .maybeSingle();
    const rail: 'nacha' | 'manual' | 'ap_export' = settings?.primary_rail || 'nacha';
    const memo: string = settings?.manual_default_memo || 'HAP Payment';
    const apFormat: string = settings?.ap_export_format || 'generic_csv';

    const { data: items } = await supabase
      .from('hap_batch_items')
      .select('landlord_id, unit_id, tenant_id, net_payment, status')
      .eq('batch_id', batch_id);

    const grouped = new Map<string, { amount: number; unit_id: string | null; tenant_id: string | null }>();
    for (const it of (items || [])) {
      if (it.status === 'excluded' || !it.landlord_id) continue;
      const key = it.landlord_id;
      const existing = grouped.get(key) || { amount: 0, unit_id: it.unit_id, tenant_id: it.tenant_id };
      existing.amount += Number(it.net_payment || 0);
      grouped.set(key, existing);
    }

    if (grouped.size === 0) return json({ success: false, error: 'no payable items in batch' });

    const landlordIds = Array.from(grouped.keys());
    const { data: landlordProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, business_name')
      .in('id', landlordIds);
    const nameOf = (id: string) => {
      const p = (landlordProfiles || []).find((x: any) => x.id === id);
      return p?.business_name || p?.full_name || id.slice(0, 8);
    };

    // Build ledger rows
    const ledgerRows = Array.from(grouped.entries()).map(([landlord_id, g]) => ({
      batch_id,
      agency_id: batch.agency_id,
      landlord_id,
      unit_id: g.unit_id,
      tenant_id: g.tenant_id,
      period_month: batch.period_month,
      amount: g.amount,
      rail,
      status: 'pending',
      memo,
    }));

    const { error: insErr } = await supabase.from('hap_disbursements').insert(ledgerRows);
    if (insErr) return json({ success: false, error: insErr.message });

    // Generate artifact
    let artifact: { format: string; content: string; filename: string } | null = null;

    if (rail === 'ap_export') {
      const exportRows: ExportRow[] = Array.from(grouped.entries()).map(([landlord_id, g], idx) => ({
        vendor_name: nameOf(landlord_id),
        vendor_id: landlord_id.slice(0, 12),
        amount: g.amount,
        period_month: batch.period_month,
        memo,
        reference: `${batch.batch_number}-${String(idx + 1).padStart(4, '0')}`,
      }));

      let content = '';
      let ext = 'csv';
      if (apFormat === 'yardi_csv') content = generateYardiCsv(exportRows);
      else if (apFormat === 'qb_iif') { content = generateQuickBooksIIF(exportRows); ext = 'iif'; }
      else content = generateGenericCsv(exportRows);

      artifact = {
        format: apFormat,
        content,
        filename: `hap_${batch.batch_number}_${apFormat}.${ext}`,
      };

      await supabase.from('hap_payment_batches').update({
        ap_export_format: apFormat,
      }).eq('id', batch_id);
    }

    return json({
      success: true,
      line_count: ledgerRows.length,
      rail,
      artifact,
    });
  } catch (e) {
    return json({ success: false, error: String(e) });
  }
});
