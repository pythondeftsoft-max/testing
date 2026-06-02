import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LeadSchema = z.object({
  contact_name: z.string().trim().min(1).max(200),
  contact_email: z.string().trim().email().max(255),
  contact_phone: z.string().trim().max(50).optional().nullable(),
  contact_role: z.string().trim().max(100).optional().nullable(),
  agency_name: z.string().trim().min(1).max(255),
  agency_state: z.string().trim().max(50).optional().nullable(),
  voucher_count: z.number().int().min(0).max(1000000).optional().nullable(),
  current_software: z.string().trim().max(100).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  source: z.string().trim().max(100).optional(),
  utm_source: z.string().trim().max(200).optional(),
  utm_medium: z.string().trim().max(200).optional(),
  utm_campaign: z.string().trim().max(200).optional(),
  utm_term: z.string().trim().max(200).optional(),
  utm_content: z.string().trim().max(200).optional(),
  referrer_url: z.string().trim().max(500).optional(),
  landing_page: z.string().trim().max(500).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = LeadSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ success: false, error: parsed.error.flatten().fieldErrors }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: lead, error } = await supabase
      .from("agency_leads")
      .insert({
        ...parsed.data,
        source: parsed.data.source || "for-agencies-page",
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Best-effort admin notification email
    try {
      const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (adminEmail && resendKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "OpenKey Leads <noreply@openkeyhousing.com>",
            to: [adminEmail],
            subject: `🎯 New Agency Lead: ${parsed.data.agency_name}`,
            html: `
              <h2>New Agency Lead</h2>
              <p><strong>Agency:</strong> ${parsed.data.agency_name}</p>
              <p><strong>Contact:</strong> ${parsed.data.contact_name} (${parsed.data.contact_role || "—"})</p>
              <p><strong>Email:</strong> ${parsed.data.contact_email}</p>
              <p><strong>Phone:</strong> ${parsed.data.contact_phone || "—"}</p>
              <p><strong>State:</strong> ${parsed.data.agency_state || "—"}</p>
              <p><strong>Vouchers:</strong> ${parsed.data.voucher_count ?? "—"}</p>
              <p><strong>Current Software:</strong> ${parsed.data.current_software || "—"}</p>
              <p><strong>Message:</strong></p>
              <p>${(parsed.data.message || "—").replace(/\n/g, "<br/>")}</p>
              <hr/>
              <p>Open the Sales Pipeline to follow up.</p>
            `,
          }),
        });
      }
    } catch (e) {
      console.warn("Notification email failed (non-fatal):", e);
    }

    return new Response(
      JSON.stringify({ success: true, lead_id: lead.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("Unhandled error:", e);
    return new Response(
      JSON.stringify({ success: false, error: (e instanceof Error ? e.message : String(e)) || "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
