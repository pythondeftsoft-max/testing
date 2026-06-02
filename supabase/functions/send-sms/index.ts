import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseClient, getSupabaseClientWithAuth } from "../_shared/supabase-client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let isSuperAdmin = false;
    let userId: string | null = null;
    let isSystemCall = false;

    // Check if this is a service-role (server-to-server) call
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const token = authHeader.replace("Bearer ", "");
    if (token === serviceRoleKey) {
      // Internal system call (e.g., from agent-matchmaker-api push)
      isSystemCall = true;
      isSuperAdmin = true; // System calls have full access
    } else {
      // Verify the user is authenticated
      const supabaseAuth = getSupabaseClientWithAuth(authHeader);
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;

      // Check if user is a super admin
      const supabase = getSupabaseClient();
      const { data: adminCheck } = await supabase
        .from("system_admins")
        .select("id")
        .eq("user_id", user.id)
        .eq("role_name", "super_admin")
        .eq("is_active", true)
        .maybeSingle();

      isSuperAdmin = !!adminCheck;
    }

    const supabase = getSupabaseClient();

    // Check if SMS system is enabled
    const { data: smsConfig } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'sms_system_enabled')
      .single();

    const smsEnabled = smsConfig?.config_value === true || smsConfig?.config_value === 'true';
    if (!smsEnabled) {
      return new Response(JSON.stringify({ error: "SMS system is currently disabled" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, body, conversation_id, contact_name, property_id, tenant_id, landlord_id } = await req.json();

    if (!to || !body) {
      return new Response(JSON.stringify({ error: "Missing 'to' or 'body'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine sender role
    const senderRole = isSystemCall ? "system" : (isSuperAdmin ? "admin" : "worker");

    // Get or create conversation
    let conversationId = conversation_id;
    if (!conversationId) {
      // Check if conversation exists for this phone
      const { data: existing } = await supabase
        .from("sms_conversations")
        .select("id, assigned_worker_id")
        .eq("contact_phone", to)
        .maybeSingle();

      if (existing) {
        conversationId = existing.id;

        // Gap 4: Worker ownership validation
        if (!isSuperAdmin && existing.assigned_worker_id && existing.assigned_worker_id !== userId) {
          return new Response(JSON.stringify({ error: "Forbidden: You are not assigned to this conversation" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        // Create new conversation
        const { data: newConvo, error: convoError } = await supabase
          .from("sms_conversations")
          .insert({
            contact_phone: to,
            contact_name: contact_name || null,
            assigned_worker_id: isSuperAdmin ? null : userId,
            property_id: property_id || null,
          })
          .select("id")
          .single();

        if (convoError) throw convoError;
        conversationId = newConvo.id;
      }
    } else {
      // Gap 4: Validate worker ownership on existing conversation
      if (!isSuperAdmin) {
        const { data: convoCheck } = await supabase
          .from("sms_conversations")
          .select("assigned_worker_id")
          .eq("id", conversationId)
          .maybeSingle();

        if (convoCheck && convoCheck.assigned_worker_id && convoCheck.assigned_worker_id !== userId) {
          return new Response(JSON.stringify({ error: "Forbidden: You are not assigned to this conversation" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Gap 8: Compliance - append opt-out footer
    const smsBody = body + "\n\nReply STOP to unsubscribe";

    // Send SMS via Quo (OpenPhone) API
    const quoApiKey = Deno.env.get("QUO_API_KEY");
    const quoFromNumber = Deno.env.get("QUO_FROM_NUMBER");

    if (!quoApiKey || !quoFromNumber) {
      return new Response(JSON.stringify({ error: "SMS provider not configured (QUO_API_KEY / QUO_FROM_NUMBER)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize from number to E.164
    const fromDigits = quoFromNumber.replace(/\D/g, "");
    const fromPhone = quoFromNumber.startsWith("+") ? quoFromNumber :
      (fromDigits.startsWith("1") && fromDigits.length === 11 ? `+${fromDigits}` : `+1${fromDigits}`);

    const quoResponse = await fetch("https://api.openphone.com/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": quoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: smsBody.substring(0, 1600),
        from: fromPhone,
        to: [to],
      }),
    });

    const quoData = await quoResponse.json();

    if (!quoResponse.ok) {
      console.error("Quo API error:", quoData);
      return new Response(JSON.stringify({ error: "Failed to send SMS", details: quoData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageSid = quoData?.data?.id || quoData?.id || null;
    const initialStatus = "sent";

    // Log message in database
    const { data: message, error: msgError } = await supabase
      .from("sms_messages")
      .insert({
        conversation_id: conversationId,
        twilio_message_sid: messageSid,
        direction: "outbound",
        sender_role: senderRole,
        sender_user_id: userId,
        body: body,
        delivery_status: initialStatus,
        receiver_phone: to,
        worker_owner_id: isSystemCall ? null : (isSuperAdmin ? null : userId),
        tenant_id: tenant_id || null,
        landlord_id: landlord_id || null,
        status_history: [{ status: initialStatus, timestamp: new Date().toISOString() }],
        timestamp_sent: new Date().toISOString(),
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Update conversation with last message preview
    await supabase
      .from("sms_conversations")
      .update({
        last_message_preview: body.substring(0, 100),
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    return new Response(JSON.stringify({ success: true, message, message_id: messageSid }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-sms error:", error);
    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
