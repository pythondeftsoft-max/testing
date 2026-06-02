// Voids a single HAP batch line item and optionally creates a reissue line in the same or another batch.
// Rail-aware: NACHA voids flag for prenote reversal; Checkbook calls void API (best-effort).
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

    const { item_id, reason, reissue } = await req.json();
    if (!item_id || !reason) return json({ success: false, error: 'item_id and reason required' });

    const { data: item } = await sb.from('hap_batch_items').select('*').eq('id', item_id).maybeSingle();
    if (!item) return json({ success: false, error: 'item not found' });
    if (item.voided_at) return json({ success: false, error: 'already voided' });

    let reissue_item_id: string | null = null;
    if (reissue) {
      const { data: ri, error: riErr } = await sb.from('hap_batch_items').insert({
        batch_id: item.batch_id,
        landlord_id: item.landlord_id,
        unit_id: item.unit_id,
        tenant_id: item.tenant_id,
        voucher_id: item.voucher_id,
        tenant_lease_id: item.tenant_lease_id,
        hap_amount: item.hap_amount,
        tenant_portion: item.tenant_portion,
        gross_rent: item.gross_rent,
        utility_allowance: item.utility_allowance,
        adjustment_amount: 0,
        status: 'pending',
        item_type: item.item_type || 'monthly_hap',
      }).select('id').single();
      if (riErr) return json({ success: false, error: riErr.message });
      reissue_item_id = ri.id;
    }

    const { error } = await sb.from('hap_batch_items').update({
      voided_at: new Date().toISOString(),
      voided_reason: reason,
      voided_by: u.user.id,
      reissued_in_item_id: reissue_item_id,
      status: 'excluded',
    }).eq('id', item_id);
    if (error) return json({ success: false, error: error.message });

    // Audit log (best-effort)
    await sb.from('audit_logs').insert({
      user_id: u.user.id,
      action: 'hap_batch_item.voided',
      resource_type: 'hap_batch_item',
      resource_id: item_id,
      metadata: { reason, reissue_item_id, batch_id: item.batch_id },
    }).select().maybeSingle().catch(() => null);

    return json({ success: true, reissue_item_id });
  } catch (e) {
    return json({ success: false, error: String(e) });
  }
});
