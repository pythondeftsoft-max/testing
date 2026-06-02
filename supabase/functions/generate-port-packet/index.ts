// supabase/functions/generate-port-packet/index.ts
// Generates a HUD-52665 style port packet PDF for a given agency_port_packet
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

interface ReqBody { packet_id: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { packet_id } = (await req.json()) as ReqBody;
    if (!packet_id || typeof packet_id !== "string") {
      return json({ success: false, error: "packet_id required" }, 200);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ success: false, error: "Unauthorized" }, 200);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: packet, error: pErr } = await admin
      .from("agency_port_packets")
      .select("*, housing_authorities!agency_port_packets_agency_id_fkey(name, hud_pha_code, address, city, state)")
      .eq("id", packet_id)
      .single();
    if (pErr || !packet) return json({ success: false, error: "Packet not found" }, 200);

    // Verify caller has access to packet's agency
    const { data: staffOk } = await admin.rpc("is_agency_staff", { _user_id: user.id, _agency_id: packet.agency_id });
    if (!staffOk) return json({ success: false, error: "Forbidden" }, 200);

    const issuing = (packet as any).housing_authorities;

    // Build PDF
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const draw = (text: string, x: number, y: number, opts: { size?: number; b?: boolean } = {}) => {
      page.drawText(text || "", { x, y, size: opts.size ?? 10, font: opts.b ? bold : font, color: rgb(0, 0, 0) });
    };

    let y = 760;
    draw("HOUSING CHOICE VOUCHER PROGRAM", 60, y, { size: 12, b: true }); y -= 16;
    draw("PORTABILITY PACKET (HUD-52665)", 60, y, { size: 14, b: true }); y -= 28;

    draw("ISSUING PHA", 60, y, { b: true }); y -= 14;
    draw(issuing?.name || "—", 60, y); y -= 12;
    draw(`PHA Code: ${issuing?.hud_pha_code || "—"}`, 60, y); y -= 12;
    draw(`${issuing?.address || ""} ${issuing?.city || ""}, ${issuing?.state || ""}`.trim(), 60, y); y -= 24;

    draw("RECEIVING PHA", 60, y, { b: true }); y -= 14;
    draw(packet.receiving_pha_name || "—", 60, y); y -= 12;
    draw(`PHA Code: ${packet.receiving_pha_code || "—"}`, 60, y); y -= 12;
    draw(`Contact: ${packet.receiving_pha_contact_email || "—"} / ${packet.receiving_pha_contact_phone || "—"}`, 60, y); y -= 24;

    draw("VOUCHER DETAILS", 60, y, { b: true }); y -= 14;
    draw(`Bedroom Size: ${packet.bedroom_size ?? "—"}`, 60, y); y -= 12;
    draw(`Voucher Issued: ${packet.voucher_issued_date || "—"}`, 60, y); y -= 12;
    draw(`Voucher Expires: ${packet.voucher_expiration_date || "—"}`, 60, y); y -= 24;

    draw("CURRENT FINANCIAL TERMS", 60, y, { b: true }); y -= 14;
    draw(`HAP Amount: $${Number(packet.current_hap_amount || 0).toFixed(2)}`, 60, y); y -= 12;
    draw(`Tenant Rent: $${Number(packet.current_tenant_rent || 0).toFixed(2)}`, 60, y); y -= 12;
    draw(`Utility Allowance: $${Number(packet.current_utility_allowance || 0).toFixed(2)}`, 60, y); y -= 24;

    if (packet.sla_deadline) {
      draw(`SLA Deadline: ${new Date(packet.sla_deadline).toLocaleDateString()}`, 60, y, { b: true }); y -= 14;
    }
    if (packet.decision_notes) {
      draw("Notes:", 60, y, { b: true }); y -= 12;
      draw(packet.decision_notes.slice(0, 180), 60, y); y -= 12;
    }

    y -= 30;
    draw(`Generated: ${new Date().toLocaleString()}`, 60, y, { size: 8 });

    const pdfBytes = await pdf.save();

    const path = `port-packets/${packet.agency_id}/${packet_id}.pdf`;
    const { error: upErr } = await admin.storage
      .from("agency-documents")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) return json({ success: false, error: upErr.message }, 200);

    await admin.from("agency_port_packets").update({ packet_pdf_path: path }).eq("id", packet_id);

    return json({ success: true, pdf_path: path }, 200);
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 200);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
