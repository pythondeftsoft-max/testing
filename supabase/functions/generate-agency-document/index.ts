import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fmtDate(d?: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch { return String(d); }
}

function fmtMoney(n?: number | string | null): string {
  if (n === null || n === undefined || n === "") return "0.00";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(num)) return "0.00";
  return num.toFixed(2);
}

function mergeTemplate(html: string, data: Record<string, string>): string {
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    return data[key] !== undefined && data[key] !== null ? String(data[key]) : `[${key}]`;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json();
    const { agency_id, template_id, entity_type, entity_id, extra_data } = body || {};

    if (!agency_id || !template_id) {
      return new Response(JSON.stringify({ success: false, error: "Missing agency_id or template_id" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch template (system default OR agency-owned)
    const { data: template, error: tErr } = await supabase
      .from("agency_document_templates")
      .select("*")
      .eq("id", template_id)
      .maybeSingle();

    if (tErr || !template) {
      return new Response(JSON.stringify({ success: false, error: "Template not found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch agency
    const { data: agency } = await supabase
      .from("housing_authorities")
      .select("name, city, state, phone, email")
      .eq("id", agency_id)
      .maybeSingle();

    // Build merge data from various entities
    const mergeData: Record<string, string> = {
      today: fmtDate(new Date().toISOString()),
      agency_name: agency?.name || "Housing Authority",
      agency_city: agency?.city || "",
      agency_state: agency?.state || "",
      agency_phone: agency?.phone || "",
      agency_email: agency?.email || "",
      ...(extra_data || {}),
    };

    let recipientName = "";

    // Resolve entity-specific data
    if (entity_id && entity_type) {
      if (entity_type === "tenant") {
        const { data: tenant } = await supabase
          .from("profiles")
          .select("first_name, last_name, email, phone")
          .eq("id", entity_id)
          .maybeSingle();
        if (tenant) {
          recipientName = `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim();
          mergeData.tenant_name = recipientName;
          mergeData.tenant_email = tenant.email || "";
          mergeData.tenant_phone = tenant.phone || "";
        }
        const { data: voucher } = await supabase
          .from("agency_vouchers")
          .select("*")
          .eq("agency_id", agency_id)
          .eq("tenant_id", entity_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (voucher) {
          mergeData.voucher_number = voucher.voucher_number || "";
          mergeData.bedroom_size = String(voucher.bedroom_size || "");
          mergeData.issue_date = fmtDate(voucher.issued_date);
          mergeData.expiration_date = fmtDate(voucher.expiration_date);
        }
        const { data: contract } = await supabase
          .from("agency_hap_contracts")
          .select("*")
          .eq("agency_id", agency_id)
          .eq("tenant_id", entity_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (contract) {
          mergeData.contract_number = contract.contract_number || "";
          mergeData.property_address = contract.property_address || "";
          mergeData.gross_rent = fmtMoney(contract.gross_rent);
          mergeData.hap_amount = fmtMoney(contract.hap_amount);
          mergeData.tenant_rent = fmtMoney(contract.tenant_rent);
          mergeData.bedroom_count = String(contract.bedroom_count || "");
          mergeData.effective_date = fmtDate(contract.effective_date);
          mergeData.expiration_date = mergeData.expiration_date || fmtDate(contract.expiration_date);
        }
      } else if (entity_type === "landlord") {
        const { data: ll } = await supabase
          .from("agency_landlords")
          .select("landlord_name, landlord_email")
          .eq("id", entity_id)
          .maybeSingle();
        if (ll) {
          recipientName = ll.landlord_name || "";
          mergeData.landlord_name = recipientName;
          mergeData.landlord_email = ll.landlord_email || "";
        }
      } else if (entity_type === "hap_contract") {
        const { data: contract } = await supabase
          .from("agency_hap_contracts")
          .select("*")
          .eq("id", entity_id)
          .maybeSingle();
        if (contract) {
          mergeData.contract_number = contract.contract_number || "";
          mergeData.property_address = contract.property_address || "";
          mergeData.gross_rent = fmtMoney(contract.gross_rent);
          mergeData.hap_amount = fmtMoney(contract.hap_amount);
          mergeData.tenant_rent = fmtMoney(contract.tenant_rent);
          mergeData.bedroom_count = String(contract.bedroom_count || "");
          mergeData.effective_date = fmtDate(contract.effective_date);
          mergeData.expiration_date = fmtDate(contract.expiration_date);
          // Pull tenant + landlord names
          if (contract.tenant_id) {
            const { data: t } = await supabase.from("profiles")
              .select("first_name, last_name").eq("id", contract.tenant_id).maybeSingle();
            if (t) mergeData.tenant_name = `${t.first_name || ""} ${t.last_name || ""}`.trim();
          }
          if (contract.landlord_id) {
            const { data: l } = await supabase.from("profiles")
              .select("first_name, last_name").eq("id", contract.landlord_id).maybeSingle();
            if (l) {
              mergeData.landlord_name = `${l.first_name || ""} ${l.last_name || ""}`.trim();
              recipientName = mergeData.landlord_name;
            }
          }
        }
      }
    }

    // Render the document HTML
    const renderedBody = mergeTemplate(template.body_html || "", mergeData);
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${template.name}</title>
<style>
body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.5; color: #1a1a1a; max-width: 720px; margin: 40px auto; padding: 20px; }
h1 { color: #1e3a8a; font-size: 18pt; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 16px; }
h2 { color: #1e3a8a; font-size: 14pt; margin-top: 20px; }
strong { color: #0f172a; }
ul, ol { margin: 12px 0; padding-left: 24px; }
.footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 10pt; color: #64748b; }
</style></head><body>${renderedBody}
${template.footer_text ? `<div class="footer">${template.footer_text}</div>` : ""}
</body></html>`;

    // Save as HTML (browser-printable to PDF). The frontend can also pass to pdfGenerator.
    const safeName = (template.name || "document").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const recipientSlug = recipientName.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const fileName = `${safeName}${recipientSlug ? "_" + recipientSlug : ""}_${Date.now()}.html`;
    const filePath = `${agency_id}/${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from("agency-generated-docs")
      .upload(filePath, new TextEncoder().encode(fullHtml), {
        contentType: "text/html",
        upsert: false,
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return new Response(JSON.stringify({ success: false, error: `Upload failed: ${uploadErr.message}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify generator
    const authHeader = req.headers.get("Authorization") || "";
    let generatedBy: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) generatedBy = user.id;
    }

    // Log
    await supabase.from("agency_generated_documents").insert({
      agency_id,
      template_id,
      template_name: template.name,
      category: template.category,
      entity_type: entity_type || null,
      entity_id: entity_id || null,
      recipient_name: recipientName || null,
      file_path: filePath,
      file_size: fullHtml.length,
      generated_by: generatedBy,
      merge_data: mergeData,
      status: "generated",
    });

    // Signed URL
    const { data: urlData } = await supabase.storage
      .from("agency-generated-docs")
      .createSignedUrl(filePath, 600);

    return new Response(JSON.stringify({
      success: true,
      signedUrl: urlData?.signedUrl,
      fileName,
      filePath,
      html: fullHtml,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const msg = err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "Unknown error";
    console.error("generate-agency-document error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
