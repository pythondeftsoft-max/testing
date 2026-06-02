import { getSupabaseClient } from "../_shared/supabase-client.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.json();
    const supabase = getSupabaseClient();

    const eventType = payload.type;
    const obj = payload.data?.object;

    if (!eventType || !obj) {
      console.warn("Unknown webhook payload:", JSON.stringify(payload).substring(0, 500));
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ---- DELIVERY STATUS UPDATE ----
    if (eventType === "message.deliveryStatusChanged") {
      const messageId = obj.id;
      const newStatus = obj.status; // e.g. "delivered", "failed"
      console.log(`Status update: ${messageId} -> ${newStatus}`);

      const { data: existingMsg } = await supabase
        .from("sms_messages")
        .select("id, status_history")
        .eq("twilio_message_sid", messageId)
        .maybeSingle();

      if (existingMsg) {
        const currentHistory = Array.isArray(existingMsg.status_history) ? existingMsg.status_history : [];
        const newEntry = { status: newStatus, timestamp: new Date().toISOString() };
        const updatedHistory = [...currentHistory, newEntry];

        const updateFields: Record<string, unknown> = {
          delivery_status: newStatus,
          status_updated_at: new Date().toISOString(),
          status_history: updatedHistory,
        };

        if (newStatus === "sent") {
          updateFields.timestamp_sent = new Date().toISOString();
        } else if (newStatus === "delivered") {
          updateFields.timestamp_delivered = new Date().toISOString();
        }

        await supabase
          .from("sms_messages")
          .update(updateFields)
          .eq("id", existingMsg.id);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ---- INBOUND MESSAGE ----
    if (eventType === "message.received") {
      const from = obj.from;
      const body = obj.body || obj.content || "";
      const messageId = obj.id;

      console.log(`Inbound SMS from ${from}: ${body.substring(0, 50)}`);

      const { data: conversation } = await supabase
        .from("sms_conversations")
        .select("id, assigned_worker_id")
        .eq("contact_phone", from)
        .maybeSingle();

      let conversationId: string;
      let workerOwnerId: string | null = null;

      if (conversation) {
        conversationId = conversation.id;
        workerOwnerId = conversation.assigned_worker_id;
      } else {
        const { data: newConvo, error: convoError } = await supabase
          .from("sms_conversations")
          .insert({
            contact_phone: from,
            contact_name: null,
            status: "active",
          })
          .select("id")
          .single();

        if (convoError) {
          console.error("Error creating conversation:", convoError);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }
        conversationId = newConvo.id;
      }

      // Insert inbound message
      const { error: msgError } = await supabase
        .from("sms_messages")
        .insert({
          conversation_id: conversationId,
          twilio_message_sid: messageId || null,
          direction: "inbound",
          sender_role: "contact",
          body: body,
          delivery_status: "received",
          worker_owner_id: workerOwnerId,
          status_history: [{ status: "received", timestamp: new Date().toISOString() }],
        });

      if (msgError) {
        console.error("Error inserting inbound message:", msgError);
      }

      // Increment unread count
      try {
        await supabase.rpc("increment_unread_count", { conv_id: conversationId });
      } catch {
        await supabase
          .from("sms_conversations")
          .update({
            unread_count: 1,
            last_message_preview: body.substring(0, 100),
            last_message_at: new Date().toISOString(),
          })
          .eq("id", conversationId);
      }

      // Update last message
      await supabase
        .from("sms_conversations")
        .update({
          last_message_preview: body.substring(0, 100),
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    console.warn("Unhandled webhook event type:", eventType);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("openphone-webhook error:", error);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
