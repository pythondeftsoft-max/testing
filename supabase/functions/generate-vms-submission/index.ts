import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') || '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { global: { headers: { Authorization: auth } } });
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ success: false, error: 'unauthorized' });

    const { agency_id, period_month } = await req.json();
    if (!agency_id || !period_month) return json({ success: false, error: 'agency_id and period_month required' });

    const monthStart = new Date(period_month);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const startISO = monthStart.toISOString().slice(0, 10);
    const endISO = monthEnd.toISOString().slice(0, 10);

    // Aggregate disbursements (paid only) for HAP expense
    const { data: disbursements } = await sb
      .from('hap_disbursements')
      .select('amount, landlord_id, status, paid_at, period_month')
      .eq('agency_id', agency_id)
      .eq('status', 'paid')
      .eq('period_month', startISO);

    const hap_expense = (disbursements || []).reduce((s: number, d: any) => s + Number(d.amount || 0), 0);
    const units_leased = new Set((disbursements || []).map((d: any) => d.landlord_id)).size;

    // Active leases for units under lease
    const { count: activeLeaseCount } = await sb
      .from('tenant_leases')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agency_id)
      .eq('lease_category', 'voucher')
      .eq('status', 'active');

    // Port packets in period
    const { data: ports } = await sb
      .from('agency_port_packets')
      .select('packet_type, created_at')
      .eq('agency_id', agency_id)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString() + 'T23:59:59');
    const port_in = (ports || []).filter((p: any) => p.packet_type === 'port_in').length;
    const port_out = (ports || []).filter((p: any) => p.packet_type === 'port_out').length;

    // FSS escrow balance
    let fss_total = 0;
    const { data: fss } = await sb
      .from('fss_escrow_ledger')
      .select('amount, transaction_type')
      .eq('agency_id', agency_id)
      .lte('transaction_date', endISO);
    if (fss) {
      for (const r of fss) {
        const amt = Number(r.amount || 0);
        fss_total += r.transaction_type === 'credit' ? amt : -amt;
      }
    }

    // Admin fee earned: HUD admin fee per unit leased (use settings if configured, fallback $80/unit)
    const { data: settings } = await sb
      .from('agency_operational_settings')
      .select('admin_fee_per_unit')
      .eq('agency_id', agency_id)
      .maybeSingle();
    const adminFeePerUnit = Number(settings?.admin_fee_per_unit || 80);
    const admin_fee_earned = adminFeePerUnit * units_leased;

    // Build CSV (HUD VMS-style aggregate row)
    const csvLines = [
      'Period,UnitsLeased,UnitsUnderLease,HAPExpense,AdminFeeEarned,UDUnits,PortInUnits,PortOutUnits,FSSEscrowBalance',
      [startISO, units_leased, activeLeaseCount || 0, hap_expense.toFixed(2), admin_fee_earned.toFixed(2), 0, port_in, port_out, fss_total.toFixed(2)].join(','),
    ];
    const csvContent = csvLines.join('\n') + '\n';

    // Upsert submission row
    const { data: existing } = await sb
      .from('agency_vms_submissions')
      .select('id, status')
      .eq('agency_id', agency_id)
      .eq('period_month', startISO)
      .maybeSingle();

    const payload = {
      agency_id,
      period_month: startISO,
      units_leased,
      units_under_lease: activeLeaseCount || 0,
      hap_expense,
      admin_fee_earned,
      ud_units: 0,
      port_in_units: port_in,
      port_out_units: port_out,
      fss_escrow_balance: fss_total,
      status: existing?.status === 'submitted' ? 'submitted' : 'draft',
    };

    let row;
    if (existing) {
      const { data, error } = await sb.from('agency_vms_submissions').update(payload).eq('id', existing.id).select().maybeSingle();
      if (error) return json({ success: false, error: error.message });
      row = data;
    } else {
      const { data, error } = await sb.from('agency_vms_submissions').insert(payload).select().maybeSingle();
      if (error) return json({ success: false, error: error.message });
      row = data;
    }

    // Pending-batch warning
    const { count: pendingCount } = await sb
      .from('hap_payment_batches')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agency_id)
      .eq('period_month', startISO)
      .in('status', ['draft', 'reviewed', 'approved', 'pending_second_approval']);

    return json({
      success: true,
      submission: row,
      csv: csvContent,
      filename: `VMS_${agency_id.slice(0, 8)}_${startISO}.csv`,
      warnings: pendingCount ? [`${pendingCount} HAP batch(es) for this period are not yet disbursed. VMS reflects only paid disbursements.`] : [],
    });
  } catch (e) {
    return json({ success: false, error: String(e) });
  }
});
