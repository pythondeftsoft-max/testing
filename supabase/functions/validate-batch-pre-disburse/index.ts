import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

interface Issue {
  landlord_id?: string;
  landlord_name?: string;
  reason: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') || '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { global: { headers: { Authorization: auth } } });
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ success: false, error: 'unauthorized' });

    const { batch_id } = await req.json();
    if (!batch_id) return json({ success: false, error: 'batch_id required' });

    const { data: batch } = await sb
      .from('hap_payment_batches')
      .select('id, agency_id, period_month')
      .eq('id', batch_id)
      .maybeSingle();
    if (!batch) return json({ success: false, error: 'batch not found' });

    const { data: items } = await sb
      .from('hap_batch_items')
      .select('landlord_id, tenant_lease_id, status')
      .eq('batch_id', batch_id);

    const includedItems = (items || []).filter((i: any) => i.status !== 'excluded');
    const landlordIds = Array.from(new Set(includedItems.map((i: any) => i.landlord_id).filter(Boolean))) as string[];
    const leaseIds = Array.from(new Set(includedItems.map((i: any) => i.tenant_lease_id).filter(Boolean))) as string[];

    const { data: settings } = await sb
      .from('agency_payment_settings')
      .select('primary_rail')
      .eq('agency_id', batch.agency_id)
      .maybeSingle();
    const rail = settings?.primary_rail || 'nacha';

    const { data: landlords } = await sb
      .from('agency_landlords')
      .select('landlord_user_id, landlord_name, w9_status, pay_ready, pay_hold_reason, preferred_disburse_rail')
      .eq('agency_id', batch.agency_id)
      .in('landlord_user_id', landlordIds);

    // Pull landlord emails for Checkbook validation
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, email')
      .in('id', landlordIds);
    const emailOf = (id: string) => (profiles || []).find((p: any) => p.id === id)?.email;

    const blockers: Issue[] = [];
    const warnings: Issue[] = [];

    for (const lid of landlordIds) {
      const ll = (landlords || []).find((x: any) => x.landlord_user_id === lid);
      const name = ll?.landlord_name || lid.slice(0, 8);
      if (!ll) {
        blockers.push({ landlord_id: lid, landlord_name: name, reason: 'Landlord not registered with this agency' });
        continue;
      }
      if (ll.w9_status !== 'verified' && ll.w9_status !== 'approved') {
        blockers.push({ landlord_id: lid, landlord_name: name, reason: `W-9 not verified (status: ${ll.w9_status || 'missing'})` });
      }
      const effectiveRail = ll.preferred_disburse_rail || rail;
      if (effectiveRail === 'nacha' && !ll.pay_ready) {
        blockers.push({ landlord_id: lid, landlord_name: name, reason: ll.pay_hold_reason || 'Banking not verified for ACH' });
      }
      if (effectiveRail === 'checkbook' && !emailOf(lid)) {
        blockers.push({ landlord_id: lid, landlord_name: name, reason: 'No email on file for Checkbook delivery' });
      }
    }

    // HAP contracts expired/terminated
    const { data: contracts } = await sb
      .from('agency_hap_contracts')
      .select('landlord_id, tenant_id, status, end_date')
      .eq('agency_id', batch.agency_id)
      .in('landlord_id', landlordIds);
    const periodEnd = new Date(batch.period_month);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    for (const c of (contracts || [])) {
      if (c.status === 'terminated') {
        warnings.push({ landlord_id: c.landlord_id, reason: `HAP contract terminated for tenant ${(c.tenant_id || '').slice(0, 8)}` });
      } else if (c.end_date && new Date(c.end_date) < new Date(batch.period_month)) {
        blockers.push({ landlord_id: c.landlord_id, reason: `HAP contract expired ${c.end_date}` });
      }
    }

    // Lease end-dated before period
    if (leaseIds.length > 0) {
      const { data: leases } = await sb
        .from('tenant_leases')
        .select('id, landlord_id, end_date, status')
        .in('id', leaseIds);
      for (const l of (leases || [])) {
        if (l.end_date && new Date(l.end_date) < new Date(batch.period_month)) {
          blockers.push({ landlord_id: l.landlord_id, reason: `Lease ended ${l.end_date} before period start` });
        }
      }
    }

    // Open repayment > $500 (warning)
    const { data: repayments } = await sb
      .from('agency_repayment_agreements')
      .select('tenant_id, balance_remaining, status')
      .eq('agency_id', batch.agency_id)
      .in('status', ['active', 'at_risk'])
      .gt('balance_remaining', 500);
    if (repayments?.length) {
      warnings.push({ reason: `${repayments.length} tenant(s) with open repayment balance > $500` });
    }

    // Pending special claims (warning)
    const { count: pendingClaims } = await sb
      .from('agency_special_claims')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', batch.agency_id)
      .in('landlord_id', landlordIds)
      .eq('status', 'pending');
    if (pendingClaims && pendingClaims > 0) {
      warnings.push({ reason: `${pendingClaims} pending special claim(s) against included landlords` });
    }

    return json({ success: true, blockers, warnings, rail });
  } catch (e) {
    return json({ success: false, error: String(e) });
  }
});
