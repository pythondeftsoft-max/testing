import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  agency_id: string;
  reason?: string;
  reactivate?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: Body = await req.json();
    if (!body.agency_id) {
      return new Response(JSON.stringify({ success: false, error: 'agency_id is required' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isAdmin } = await userClient.rpc('is_admin', { user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: 'Admin access required' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reactivate = !!body.reactivate;
    const newStatus = reactivate ? 'active' : 'offboarded';

    // 1. Update housing_authorities
    const { error: haErr } = await admin
      .from('housing_authorities')
      .update({
        status: newStatus,
        offboarded_at: reactivate ? null : new Date().toISOString(),
        offboarded_reason: reactivate ? null : (body.reason || null),
        offboarded_by: reactivate ? null : user.id,
        is_active: reactivate,
      })
      .eq('id', body.agency_id);
    if (haErr) {
      return new Response(JSON.stringify({ success: false, error: haErr.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Toggle staff active state
    await admin
      .from('agency_staff')
      .update({ is_active: reactivate })
      .eq('agency_id', body.agency_id);

    // 3. Disable white-label config (best-effort)
    try {
      await admin
        .from('white_label_configs')
        .update({ is_active: reactivate })
        .eq('agency_id', body.agency_id);
    } catch (e) {
      console.log('[offboard-agency] white-label update skipped:', e);
    }

    // 4. Audit log (best-effort)
    try {
      await admin.from('agency_activity_log').insert({
        agency_id: body.agency_id,
        actor_id: user.id,
        action: reactivate ? 'agency_reactivated' : 'agency_offboarded',
        entity_type: 'housing_authority',
        entity_id: body.agency_id,
        metadata: { reason: body.reason || null },
      });
    } catch (e) {
      console.log('[offboard-agency] activity log skipped:', e);
    }

    return new Response(JSON.stringify({ success: true, agency_id: body.agency_id, status: newStatus }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[offboard-agency] error:', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Internal error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
