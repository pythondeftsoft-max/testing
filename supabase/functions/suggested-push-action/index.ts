import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { suggestion_id, action, rejection_reason } = await req.json();
    if (!suggestion_id || !['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid input' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: sug } = await supabase
      .from('suggested_pushes')
      .select('*')
      .eq('id', suggestion_id)
      .maybeSingle();
    if (!sug || sug.status !== 'pending') {
      return new Response(JSON.stringify({ success: false, error: 'Not found or already actioned' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reject') {
      await supabase
        .from('suggested_pushes')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejection_reason || null,
        })
        .eq('id', suggestion_id);
      return new Response(JSON.stringify({ success: true, action: 'rejected' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Approve → create the actual push
    const { data: push, error: pushErr } = await supabase
      .from('property_pushes')
      .insert({
        tenant_id: sug.tenant_id,
        property_id: sug.property_id,
        unit_id: sug.unit_id,
        push_type: 'auto_pushed',
        notes: `Approved suggestion (score ${sug.score}) by ${user.email || user.id}`,
        admin_id: user.id,
        status: 'push_sent',
        pushed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (pushErr) {
      return new Response(JSON.stringify({ success: false, error: pushErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase
      .from('suggested_pushes')
      .update({
        status: 'sent',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        push_id: push.id,
      })
      .eq('id', suggestion_id);

    // Fire Quo SMS via push-notify-tenant (fire-and-forget)
    let smsResult: any = null;
    try {
      const { data: notifyData } = await supabase.functions.invoke('push-notify-tenant', {
        body: { push_id: push.id },
      });
      smsResult = notifyData;
    } catch (e) {
      console.warn('[suggested-push-action] notify failed', e);
    }

    return new Response(JSON.stringify({ success: true, push_id: push.id, sms: smsResult }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[suggested-push-action] Error:', error);
    return new Response(JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
