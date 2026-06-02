import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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

    const { disbursement_id, reason } = await req.json();
    if (!disbursement_id || !reason) return json({ success: false, error: 'disbursement_id and reason required' });

    const { data: disb } = await supabase
      .from('hap_disbursements')
      .select('id, agency_id, landlord_id, amount, batch_id')
      .eq('id', disbursement_id)
      .maybeSingle();
    if (!disb) return json({ success: false, error: 'disbursement not found' });

    const { error: upErr } = await supabase
      .from('hap_disbursements')
      .update({ status: 'bounced', bounced_at: new Date().toISOString(), bounce_reason: reason })
      .eq('id', disbursement_id);
    if (upErr) return json({ success: false, error: upErr.message });

    // Notify agency admins/finance of the bounce
    const { data: staff } = await supabase
      .from('agency_staff')
      .select('user_id')
      .eq('agency_id', disb.agency_id)
      .in('role', ['agency_admin', 'finance', 'caseworker_supervisor']);

    const { data: landlord } = await supabase
      .from('profiles')
      .select('full_name, business_name')
      .eq('id', disb.landlord_id)
      .maybeSingle();
    const name = landlord?.business_name || landlord?.full_name || 'Landlord';

    if (staff && staff.length > 0) {
      const notifications = staff.map((s: any) => ({
        user_id: s.user_id,
        title: 'HAP Disbursement Bounced',
        description: `${name} payment of $${Number(disb.amount).toFixed(2)} bounced (${reason}). Update banking before next batch.`,
        type: 'warning',
        category: 'finance',
        priority: 'high',
        related_entity_type: 'hap_disbursement',
        related_entity_id: disbursement_id,
      }));
      await supabase.from('notifications').insert(notifications);
    }

    return json({ success: true });
  } catch (e) {
    return json({ success: false, error: String(e) });
  }
});
