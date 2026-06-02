// Generates a monthly billing snapshot for active "billed" port-in arrangements.
// Inserts an agency_activity_log entry per generated billing event so it surfaces in the audit trail
// and can be picked up by the agency ledger as an inbound HAP receivable.
// Idempotent: deduplicates per portability_id + billing_period (YYYY-MM).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // All port-ins with billing arrangement = "billed" and status leased/billed
    const { data: requests, error } = await supabase
      .from('agency_portability_requests')
      .select('id, agency_id, contact_name, hap_amount, admin_fee, billing_arrangement, status, request_type')
      .eq('request_type', 'port_in')
      .eq('billing_arrangement', 'billed')
      .in('status', ['leased', 'billed']);

    if (error) throw error;

    let invoiced = 0;
    let skipped = 0;

    for (const r of requests || []) {
      const total = (Number(r.hap_amount) || 0) + (Number(r.admin_fee) || 0);
      if (total <= 0) {
        skipped++;
        continue;
      }

      // Idempotency check: look for an existing activity_log entry for this period
      const { data: dup } = await supabase
        .from('agency_activity_log')
        .select('id')
        .eq('agency_id', r.agency_id)
        .eq('entity_type', 'portability_billing')
        .eq('entity_id', r.id)
        .eq('action', `bill_${period}`)
        .limit(1);
      if (dup && dup.length > 0) {
        skipped++;
        continue;
      }

      const { error: logErr } = await supabase.from('agency_activity_log').insert({
        agency_id: r.agency_id,
        entity_type: 'portability_billing',
        entity_id: r.id,
        action: `bill_${period}`,
        metadata: {
          period,
          hap_amount: Number(r.hap_amount) || 0,
          admin_fee: Number(r.admin_fee) || 0,
          total,
          contact_name: r.contact_name,
        } as any,
      });
      if (logErr) {
        console.error('billing log insert error', logErr);
        continue;
      }

      // Flip status to "billed" so the dashboard reflects active billing
      if (r.status === 'leased') {
        await supabase
          .from('agency_portability_requests')
          .update({ status: 'billed' })
          .eq('id', r.id);
      }
      invoiced++;
    }

    console.log(`process-portability-billing: period=${period}, invoiced=${invoiced}, skipped=${skipped}`);

    return new Response(JSON.stringify({ success: true, period, invoiced, skipped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('process-portability-billing error', e);
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
