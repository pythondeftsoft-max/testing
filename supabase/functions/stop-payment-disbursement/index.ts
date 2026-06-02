// Issues a stop-payment request on a single HAP batch line.
// - Checkbook rail: best-effort void via Checkbook API.
// - NACHA rail: marks `stop_status='requested'` (ACH spec doesn't allow auto recall post-window).
// - Manual rail: marks stopped, agency must contact bank.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') || '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ success: false, error: 'unauthorized' });

    const { item_id, reason } = await req.json();
    if (!item_id || !reason) return json({ success: false, error: 'item_id and reason required' });

    const { data: item } = await sb.from('hap_batch_items').select('*').eq('id', item_id).maybeSingle();
    if (!item) return json({ success: false, error: 'item not found' });
    if (item.voided_at) return json({ success: false, error: 'line is voided' });
    if (item.stop_requested_at) return json({ success: false, error: 'stop already requested' });

    // Determine rail from batch
    const { data: batch } = await sb.from('hap_payment_batches').select('rail, status').eq('id', item.batch_id).maybeSingle();
    const rail = (batch?.rail || 'manual') as string;

    let status = 'requested';
    let log = `stop requested by ${u.user.id} (rail=${rail}): ${reason}`;

    if (rail === 'checkbook') {
      // Best-effort Checkbook void
      const apiKey = Deno.env.get('CHECKBOOK_API_KEY');
      const apiSecret = Deno.env.get('CHECKBOOK_API_SECRET');
      const checkId = (item as any).external_payment_id;
      if (apiKey && apiSecret && checkId) {
        try {
          const res = await fetch(`https://api.checkbook.io/v3/check/${checkId}`, {
            method: 'DELETE',
            headers: { Authorization: `${apiKey}:${apiSecret}` },
          });
          status = res.ok ? 'stopped' : 'requested';
          log += `\ncheckbook DELETE → ${res.status}`;
        } catch (e) {
          log += `\ncheckbook error: ${String(e)}`;
        }
      } else {
        log += '\nno external_payment_id; manual cancel required';
      }
    }

    const { error } = await sb
      .from('hap_batch_items')
      .update({
        stop_requested_at: new Date().toISOString(),
        stop_status: status,
        stop_requested_by: u.user.id,
      })
      .eq('id', item_id);
    if (error) return json({ success: false, error: error.message });

    await sb.from('audit_logs').insert({
      user_id: u.user.id,
      action: 'hap_batch_item.stop_payment',
      resource_type: 'hap_batch_item',
      resource_id: item_id,
      metadata: { reason, rail, status, log },
    }).select().maybeSingle().catch(() => null);

    return json({ success: true, status, rail });
  } catch (e) {
    return json({ success: false, error: String(e) });
  }
});
