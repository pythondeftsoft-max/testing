import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  push_id: string;
  custom_message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { push_id, custom_message } = (await req.json()) as Body;
    if (!push_id) {
      return new Response(JSON.stringify({ success: false, error: 'push_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Load push + tenant + unit + property
    const { data: push, error: pushErr } = await supabase
      .from('property_pushes')
      .select('id, tenant_id, unit_id, property_id, sms_conversation_id')
      .eq('id', push_id)
      .maybeSingle();

    if (pushErr || !push) {
      return new Response(JSON.stringify({ success: false, error: 'push_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Resolve tenant phone + name from profiles (push.tenant_id == user_id)
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('id', push.tenant_id)
      .maybeSingle();

    const phone = profile?.phone as string | null;
    const displayName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim();

    if (!phone) {
      return new Response(JSON.stringify({ success: false, error: 'tenant_has_no_phone' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Build message body
    let body = custom_message ?? '';
    if (!body) {
      const { data: unit } = await supabase
        .from('property_units')
        .select('bedrooms, bathrooms, monthly_rent, properties:property_id(address, city, state)')
        .eq('id', push.unit_id)
        .maybeSingle();
      const prop: any = unit?.properties;
      const addr = prop ? `${prop.address}, ${prop.city}, ${prop.state}` : 'a new home';
      const beds = unit?.bedrooms ? `${unit.bedrooms}BR` : '';
      const rent = unit?.monthly_rent ? `$${unit.monthly_rent}/mo` : '';
      body = `Hi${displayName ? ' ' + displayName.split(' ')[0] : ''}! We found a match for you: ${addr}${beds ? ' • ' + beds : ''}${rent ? ' • ' + rent : ''}. Reply YES if you'd like a tour. — OpenKey Housing`;
    }

    // 4. Find or create sms_conversations row tagged with property_id
    let conversationId = push.sms_conversation_id as string | null;
    if (!conversationId) {
      const { data: existing } = await supabase
        .from('sms_conversations')
        .select('id')
        .eq('contact_phone', phone)
        .eq('property_id', push.property_id)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        conversationId = existing.id;
      }
    }

    // 5. Send SMS via existing Quo-backed send-sms function
    const { data: sendResult, error: sendErr } = await supabase.functions.invoke('send-sms', {
      body: {
        to: phone,
        body,
        conversation_id: conversationId,
        contact_name: displayName || undefined,
        property_id: push.property_id,
        tenant_id: push.tenant_id,
      },
    });

    if (sendErr || !sendResult?.success) {
      console.error('[push-notify-tenant] send-sms failed', sendErr, sendResult);
      return new Response(JSON.stringify({ success: false, error: sendErr?.message ?? 'send_sms_failed', detail: sendResult }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Stamp the push with conversation + message ids
    const newConvId = sendResult.message?.conversation_id ?? conversationId;
    const newMsgId = sendResult.message?.id ?? null;

    await supabase
      .from('property_pushes')
      .update({
        sms_conversation_id: newConvId,
        sms_message_id: newMsgId,
      })
      .eq('id', push_id);

    return new Response(
      JSON.stringify({ success: true, conversation_id: newConvId, message_id: newMsgId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[push-notify-tenant] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error?.message ?? 'unknown' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
