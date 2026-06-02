import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const Schema = z.object({
  lead_id: z.string().uuid(),
  to: z.string().email().max(255),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(20000),
  template_key: z.string().max(50).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await supabaseAuth.auth.getUser();
    if (!userRes.user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: isAdmin } = await supabase.rpc("is_admin", { check_user_id: userRes.user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Admin required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ success: false, error: parsed.error.flatten().fieldErrors }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { lead_id, to, subject, body, template_key } = parsed.data;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const html = `<div style="font-family: -apple-system, sans-serif; max-width: 600px; line-height: 1.6;">
      ${body.split('\n').map(l => l ? `<p style="margin:0 0 12px;">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>` : '<br/>').join('')}
    </div>`;

    const replyTo = Deno.env.get("SALES_REPLY_TO");
    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "OpenKey Sales <sales@openkeyhousing.com>",
        to: [to],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject,
        html,
      }),
    });
    const sendJson = await sendRes.json();
    if (!sendRes.ok) {
      return new Response(
        JSON.stringify({ success: false, error: sendJson?.message || "Send failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase.from("agency_lead_activities").insert({
      lead_id,
      actor_id: userRes.user.id,
      activity_type: "email_sent",
      description: `Sent: ${subject}`,
      metadata: { to, template_key, resend_id: sendJson?.id },
    });

    await supabase.from("agency_leads").update({
      last_contacted_at: new Date().toISOString(),
    }).eq("id", lead_id);

    return new Response(
      JSON.stringify({ success: true, id: sendJson?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error(e);
    return new Response(
      JSON.stringify({ success: false, error: (e instanceof Error ? e.message : String(e)) || "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
