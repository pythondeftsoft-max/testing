import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ success: false, error: 'Unauthorized' });

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(url, serviceKey);
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ success: false, error: 'Unauthorized' });
    const { data: isAdmin } = await userClient.rpc('is_admin', { user_id: user.id });
    if (!isAdmin) return json({ success: false, error: 'Forbidden' });

    const { agency_id, force = false } = (await req.json()) as { agency_id: string; force?: boolean };
    if (!agency_id) return json({ success: false, error: 'agency_id required' });

    // Check readiness
    const [{ data: contracts }, { data: invoices }, { data: staff }, { data: progress }, { data: intake }] = await Promise.all([
      admin.from('agency_contracts').select('status').eq('agency_id', agency_id),
      admin.from('agency_invoices').select('status').eq('agency_id', agency_id),
      admin.from('agency_staff').select('id').eq('agency_id', agency_id).eq('is_active', true),
      admin.from('agency_onboarding_progress').select('is_completed').eq('agency_id', agency_id).maybeSingle(),
      admin.from('agency_intake_files').select('kind, status').eq('agency_id', agency_id),
    ]);

    const checks = {
      contract_active: (contracts || []).some((c: any) => c.status === 'active'),
      invoice_paid: (invoices || []).some((i: any) => i.status === 'paid'),
      admin_invited: (staff || []).length > 0,
      provisioning_done: !!progress?.is_completed,
      data_loaded: (intake || []).some((f: any) => f.status === 'imported'),
    };
    const ready = Object.values(checks).every(Boolean);

    if (!ready && !force) return json({ success: false, error: 'Not ready', checks });

    await admin.from('housing_authorities').update({ is_onboarded: true }).eq('id', agency_id);

    return json({ success: true, checks });
  } catch (e) {
    console.error(e);
    return json({ success: false, error: (e as Error).message });
  }
});

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
