import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/**
 * Reconcile 1099 totals: compare authoritative `hap_disbursements` (status='paid')
 * vs `hap_batch_items` for a given agency + tax year. Surfaces variances >$1
 * so finance can investigate before the 1099 bulk send.
 */
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
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ success: false, error: 'unauthorized' });

    const { agency_id, tax_year } = await req.json();
    if (!agency_id || !tax_year) return json({ success: false, error: 'agency_id and tax_year required' });

    const yearStart = `${tax_year}-01-01`;
    const yearEnd = `${tax_year}-12-31T23:59:59`;

    // Authoritative paid totals from disbursements ledger
    const { data: disbRows } = await supabase
      .from('hap_disbursements')
      .select('landlord_id, amount')
      .eq('agency_id', agency_id)
      .eq('status', 'paid')
      .gte('paid_at', yearStart)
      .lte('paid_at', yearEnd);

    // Comparison totals from batch items (pre-disbursement, may include voided)
    const { data: batches } = await supabase
      .from('hap_payment_batches')
      .select('id')
      .eq('agency_id', agency_id)
      .gte('period_month', yearStart)
      .lte('period_month', yearEnd);
    const batchIds = (batches || []).map((b: any) => b.id);

    let itemRows: any[] = [];
    if (batchIds.length > 0) {
      const { data } = await supabase
        .from('hap_batch_items')
        .select('landlord_id, net_payment, status')
        .in('batch_id', batchIds)
        .neq('status', 'excluded');
      itemRows = data || [];
    }

    const disbTotals = new Map<string, number>();
    for (const r of (disbRows || [])) {
      disbTotals.set(r.landlord_id, (disbTotals.get(r.landlord_id) || 0) + Number(r.amount || 0));
    }

    const itemTotals = new Map<string, number>();
    for (const r of itemRows) {
      if (!r.landlord_id) continue;
      itemTotals.set(r.landlord_id, (itemTotals.get(r.landlord_id) || 0) + Number(r.net_payment || 0));
    }

    const allLandlords = new Set([...disbTotals.keys(), ...itemTotals.keys()]);
    const variances: any[] = [];
    for (const landlordId of allLandlords) {
      const paid = disbTotals.get(landlordId) || 0;
      const accrued = itemTotals.get(landlordId) || 0;
      const delta = +(accrued - paid).toFixed(2);
      if (Math.abs(delta) > 1) {
        variances.push({
          landlord_id: landlordId,
          authoritative_paid: +paid.toFixed(2),
          accrued_in_batches: +accrued.toFixed(2),
          variance: delta,
        });
      }
    }

    // Enrich with landlord names
    if (variances.length > 0) {
      const ids = variances.map(v => v.landlord_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, business_name')
        .in('id', ids);
      const nameOf = (id: string) => {
        const p = (profiles || []).find((x: any) => x.id === id);
        return p?.business_name || p?.full_name || id.slice(0, 8);
      };
      for (const v of variances) v.landlord_name = nameOf(v.landlord_id);
    }

    const totalPaid = Array.from(disbTotals.values()).reduce((s, n) => s + n, 0);
    const totalAccrued = Array.from(itemTotals.values()).reduce((s, n) => s + n, 0);

    return json({
      success: true,
      tax_year,
      agency_id,
      landlord_count: allLandlords.size,
      total_paid: +totalPaid.toFixed(2),
      total_accrued: +totalAccrued.toFixed(2),
      variance_count: variances.length,
      variances,
    });
  } catch (e) {
    return json({ success: false, error: String(e) });
  }
});
