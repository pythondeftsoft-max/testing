// supabase/functions/send-port-packet/index.ts
// Generates a port packet PDF (if not already) and emails it to the receiving PHA
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const RESEND = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ success: false, error: "Unauthorized" });

    const { packet_id, to_email, to_name } = await req.json();
    if (!packet_id || !to_email) return j({ success: false, error: "packet_id and to_email required" });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: packet } = await admin
      .from("agency_port_packets")
      .select("*")
      .eq("id", packet_id)
      .single();
    if (!packet) return j({ success: false, error: "Packet not found" });

    const { data: staffOk } = await admin.rpc("is_agency_staff", {
      _user_id: user.id,
      _agency_id: packet.agency_id,
    });
    if (!staffOk) return j({ success: false, error: "Forbidden" });

    let pdfPath = packet.packet_pdf_path;
    if (!pdfPath) {
      const gen = await fetch(`${SUPABASE_URL}/functions/v1/generate-port-packet`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ packet_id }),
      });
      const genJson = await gen.json();
      if (!genJson?.success) return j({ success: false, error: genJson?.error || "PDF generation failed" });
      pdfPath = genJson.pdf_path;
    }

    // Insert pending log
    const { data: logRow } = await admin.from("agency_port_packet_sends").insert({
      packet_id,
      agency_id: packet.agency_id,
      sent_to_email: to_email,
      sent_to_name: to_name || null,
      sent_by_user_id: user.id,
      status: "pending",
    }).select("id").single();

    if (!RESEND) {
      await admin.from("agency_port_packet_sends").update({
        status: "failed", error_message: "RESEND_API_KEY not configured",
      }).eq("id", logRow!.id);
      return j({ success: false, error: "Email provider not configured" });
    }

    // Download PDF
    const { data: file } = await admin.storage.from("agency-documents").download(pdfPath);
    if (!file) {
      await admin.from("agency_port_packet_sends").update({
        status: "failed", error_message: "PDF file not found",
      }).eq("id", logRow!.id);
      return j({ success: false, error: "PDF file not found" });
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    const b64 = btoa(String.fromCharCode(...buf));

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "OpenKey Porting <porting@openkeyhousing.com>",
        to: [to_email],
        subject: `HUD-52665 Port Packet${packet.receiving_pha_name ? ` for ${packet.receiving_pha_name}` : ''}`,
        html: `<p>Attached is the HUD-52665 portability packet.</p>
               <p>Please review and respond within 30 days per HUD guidance.</p>`,
        attachments: [{ filename: `port-packet-${packet_id}.pdf`, content: b64 }],
      }),
    });
    const sendJson = await sendRes.json();

    if (!sendRes.ok) {
      await admin.from("agency_port_packet_sends").update({
        status: "failed", error_message: sendJson?.message || "Send failed",
      }).eq("id", logRow!.id);
      return j({ success: false, error: sendJson?.message || "Send failed" });
    }

    await admin.from("agency_port_packet_sends").update({ status: "sent" }).eq("id", logRow!.id);
    return j({ success: true });
  } catch (e: any) {
    console.error(e);
    return j({ success: false, error: (e instanceof Error ? e.message : String(e)) });
  }
});

function j(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
