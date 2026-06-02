// supabase/functions/generate-rfp-packet/index.ts
// Generates a branded RFP/Procurement response PDF from rfp_response_library
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "https://esm.sh/pdf-lib@1.17.1";

interface ReqBody {
  categories: string[];
  recipient_name?: string;
  recipient_org?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  security: "Security",
  hud_compliance: "HUD Compliance",
  architecture: "Architecture",
  data_handling: "Data Handling",
  support: "Support & SLAs",
  pricing: "Pricing",
  other: "Other",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReqBody;
    if (!Array.isArray(body.categories) || body.categories.length === 0) {
      return json({ success: false, error: "categories required" }, 200);
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

    // admin-only
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ success: false, error: "Admin only" }, 200);

    const { data: entries } = await admin
      .from("rfp_response_library")
      .select("category, question, answer, display_order")
      .in("category", body.categories)
      .eq("is_published", true)
      .order("category", { ascending: true })
      .order("display_order", { ascending: true });

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let page = pdf.addPage([612, 792]);
    let y = 750;

    const ensureSpace = (needed: number) => {
      if (y - needed < 60) {
        page = pdf.addPage([612, 792]);
        y = 750;
      }
    };

    const wrap = (text: string, maxChars: number): string[] => {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let line = "";
      for (const w of words) {
        if ((line + " " + w).trim().length > maxChars) {
          if (line) lines.push(line);
          line = w;
        } else {
          line = (line + " " + w).trim();
        }
      }
      if (line) lines.push(line);
      return lines;
    };

    const draw = (t: string, x: number, yy: number, opts: { size?: number; b?: boolean; color?: any } = {}) => {
      page.drawText(t || "", { x, y: yy, size: opts.size ?? 10, font: opts.b ? bold : font, color: opts.color || rgb(0, 0, 0) });
    };

    // Cover
    draw("OPENKEY HOUSING", 60, y, { size: 18, b: true, color: rgb(0.1, 0.3, 0.7) }); y -= 24;
    draw("RFP / Procurement Response Packet", 60, y, { size: 14, b: true }); y -= 30;
    if (body.recipient_org) { draw(`Prepared for: ${body.recipient_org}`, 60, y, { size: 11 }); y -= 14; }
    if (body.recipient_name) { draw(`Attention: ${body.recipient_name}`, 60, y, { size: 11 }); y -= 14; }
    draw(`Date: ${new Date().toLocaleDateString()}`, 60, y, { size: 11 }); y -= 24;

    draw("This packet contains OpenKey's standard responses to procurement, security,", 60, y, { size: 10 }); y -= 12;
    draw("and HUD compliance questions commonly asked by Public Housing Authorities.", 60, y, { size: 10 }); y -= 24;

    // Group entries by category
    const grouped: Record<string, typeof entries> = {};
    (entries || []).forEach((e: any) => {
      grouped[e.category] = grouped[e.category] || [];
      grouped[e.category]!.push(e);
    });

    for (const cat of body.categories) {
      const list = grouped[cat];
      if (!list || list.length === 0) continue;

      ensureSpace(40);
      y -= 8;
      page.drawRectangle({ x: 50, y: y - 4, width: 512, height: 22, color: rgb(0.93, 0.95, 1) });
      draw(CATEGORY_LABELS[cat] || cat, 60, y + 4, { size: 12, b: true, color: rgb(0.1, 0.3, 0.7) });
      y -= 24;

      for (const e of list as any[]) {
        const qLines = wrap(e.question, 90);
        const aLines = wrap(e.answer, 95);
        ensureSpace(qLines.length * 12 + aLines.length * 11 + 22);

        for (const ln of qLines) { draw(ln, 60, y, { b: true, size: 10 }); y -= 12; }
        y -= 2;
        for (const ln of aLines) { draw(ln, 60, y, { size: 10, color: rgb(0.25, 0.25, 0.25) }); y -= 11; }
        y -= 10;
      }
    }

    // Footer
    const pages = pdf.getPages();
    pages.forEach((p, i) => {
      p.drawText(`OpenKey Housing • openkeyhousing.com • Page ${i + 1} of ${pages.length}`, {
        x: 60, y: 30, size: 8, font, color: rgb(0.5, 0.5, 0.5),
      });
    });

    const pdfBytes = await pdf.save();
    const path = `rfp-packets/${Date.now()}-${user.id.slice(0, 8)}.pdf`;
    const { error: upErr } = await admin.storage
      .from("agency-documents")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) return json({ success: false, error: upErr.message }, 200);

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
