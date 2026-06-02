import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    if (!userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'unauthorized' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { disbursement_ids, batch_id, all_pending, reference_number } = body || {};

    let targetIds: string[] = [];
    if (Array.isArray(disbursement_ids) && disbursement_ids.length > 0) {
      targetIds = disbursement_ids;
    } else if (batch_id && all_pending) {
      const { data } = await supabase
        .from('hap_disbursements')
        .select('id')
        .eq('batch_id', batch_id)
        .eq('status', 'pending');
      targetIds = (data || []).map((r: any) => r.id);
    } else {
      return new Response(JSON.stringify({ success: false, error: 'provide disbursement_ids or batch_id+all_pending' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (targetIds.length === 0) {
      return new Response(JSON.stringify({ success: true, updated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const now = new Date().toISOString();
    const updates: any = {
      status: 'paid',
      paid_at: now,
      paid_by: userData.user.id,
      notified_landlord_at: now,
    };
    if (reference_number) updates.reference_number = reference_number;

    const { data: updated, error: uErr } = await supabase
      .from('hap_disbursements')
      .update(updates)
      .in('id', targetIds)
      .eq('status', 'pending')
      .select('id, batch_id, landlord_id, amount, period_month, agency_id, rail, reference_number');

    if (uErr) {
      return new Response(JSON.stringify({ success: false, error: uErr.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // If all batch disbursements are now paid/bounced/voided, flip batch to disbursed
    const batchIds = Array.from(new Set((updated || []).map((r: any) => r.batch_id)));
    for (const bid of batchIds) {
      const { count: pendingLeft } = await supabase
        .from('hap_disbursements')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', bid)
        .eq('status', 'pending');
      if ((pendingLeft || 0) === 0) {
        await supabase
          .from('hap_payment_batches')
          .update({ status: 'disbursed', disbursed_at: now })
          .eq('id', bid);

        // Fan out per-landlord aggregated notifications (in-app + email)
        // Respect agency setting if present
        const { data: agencyRow } = await supabase
          .from('hap_payment_batches')
          .select('agency_id')
          .eq('id', bid)
          .maybeSingle();
        let shouldNotify = true;
        if (agencyRow?.agency_id) {
          const { data: setting } = await supabase
            .from('agency_payment_settings')
            .select('notify_landlord_on_disburse')
            .eq('agency_id', agencyRow.agency_id)
            .maybeSingle();
          if (setting && setting.notify_landlord_on_disburse === false) shouldNotify = false;
        }
        if (shouldNotify) {
          await supabase.functions.invoke('notify-landlord-disbursement', {
            body: { batch_id: bid },
          }).catch(() => {});
        }
      }
    }

    return new Response(JSON.stringify({ success: true, updated: updated?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
