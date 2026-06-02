import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { agency_id, template_type, tenant_id } = await req.json();
    if (!agency_id || !template_type || !tenant_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient();

    // Fetch agency info
    const { data: agency } = await supabase
      .from("housing_authorities")
      .select("name, city, state, phone, email")
      .eq("id", agency_id)
      .single();

    // Fetch tenant info
    const { data: tenant } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, phone")
      .eq("id", tenant_id)
      .single();

    // Fetch active HAP contract
    const { data: contract } = await supabase
      .from("agency_hap_contracts")
      .select("*")
      .eq("agency_id", agency_id)
      .eq("tenant_id", tenant_id)
      .eq("status", "active")
      .maybeSingle();

    // Fetch active voucher
    const { data: voucher } = await supabase
      .from("agency_vouchers")
      .select("*")
      .eq("agency_id", agency_id)
      .eq("tenant_id", tenant_id)
      .order("issued_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const tenantName = `${tenant?.first_name || ""} ${tenant?.last_name || ""}`.trim() || "Participant";
    const agencyName = agency?.name || "Housing Authority";
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // Generate document content based on template
    let title = "";
    let body = "";

    switch (template_type) {
      case "voucher_issuance":
        title = "Housing Choice Voucher Issuance Letter";
        body = `
Dear ${tenantName},

This letter is to inform you that ${agencyName} has approved your application for the Housing Choice Voucher Program (Section 8).

Voucher Details:
- Voucher Number: ${voucher?.voucher_number || "Pending"}
- Bedroom Size: ${voucher?.bedroom_size || contract?.bedroom_count || "TBD"}
- Issued Date: ${voucher?.issued_date ? new Date(voucher.issued_date).toLocaleDateString() : today}
- Expiration Date: ${voucher?.expiration_date ? new Date(voucher.expiration_date).toLocaleDateString() : "120 days from issuance"}

Payment Standard: $${contract?.hap_amount || voucher?.payment_standard || "See attached schedule"}

You are required to locate a suitable housing unit within the voucher search period. The unit must pass a Housing Quality Standards (HQS) inspection before the Housing Assistance Payment (HAP) contract can be executed.

Please contact our office at ${agency?.phone || ""} or ${agency?.email || ""} if you have any questions.

Sincerely,
${agencyName}
${agency?.city ? `${agency.city}, ${agency.state}` : ""}
        `.trim();
        break;

      case "termination_notice":
        title = "Notice of Program Termination";
        body = `
Dear ${tenantName},

This letter serves as formal notification that ${agencyName} intends to terminate your participation in the Housing Choice Voucher Program.

Effective Date: 30 days from the date of this notice
Reason: [To be specified by caseworker]

YOUR RIGHT TO AN INFORMAL HEARING:
Under 24 CFR 982.555, you have the right to request an informal hearing to contest this decision. Your request must be submitted in writing within 10 business days of receiving this notice.

To request a hearing, contact:
${agencyName}
${agency?.phone || ""}
${agency?.email || ""}

If no hearing is requested within the specified timeframe, the termination will become final.

Sincerely,
${agencyName}
        `.trim();
        break;

      case "hap_contract_summary":
        title = "Housing Assistance Payment Contract Summary";
        body = `
HAP CONTRACT SUMMARY

Agency: ${agencyName}
Date: ${today}
Tenant: ${tenantName}

Contract Details:
- Contract Number: ${contract?.contract_number || "Pending"}
- Property Address: ${contract?.property_address || "N/A"}
- Bedroom Count: ${contract?.bedroom_count || "N/A"}
- Effective Date: ${contract?.effective_date ? new Date(contract.effective_date).toLocaleDateString() : "N/A"}
- Expiration Date: ${contract?.expiration_date ? new Date(contract.expiration_date).toLocaleDateString() : "N/A"}

Financial Summary:
- Gross Rent: $${contract?.gross_rent || 0}
- Utility Allowance: $${contract?.utility_allowance || 0}
- HAP Amount: $${contract?.hap_amount || 0}
- Tenant Rent Portion: $${contract?.tenant_rent || 0}

This summary is provided for reference purposes. The executed HAP contract is the binding agreement between ${agencyName} and the property owner.
        `.trim();
        break;

      case "rent_change_notice":
        title = "Notice of Rent/HAP Adjustment";
        body = `
Dear ${tenantName},

This letter is to notify you of a change to your housing assistance payment and/or tenant rent portion.

Current Information:
- Property: ${contract?.property_address || "N/A"}
- Current HAP: $${contract?.hap_amount || 0}
- Current Tenant Rent: $${contract?.tenant_rent || 0}

New Information:
- New HAP Amount: [To be determined]
- New Tenant Rent: [To be determined]
- Effective Date: [To be determined]

Reason for Change: [Annual recertification / Interim change / Payment standard update]

If you disagree with this determination, you may request an informal hearing within 10 business days.

Contact: ${agency?.phone || ""} | ${agency?.email || ""}

Sincerely,
${agencyName}
        `.trim();
        break;

      default:
        return new Response(JSON.stringify({ error: "Unknown template type" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Create a simple text-based PDF content (stored as text for now, rendered client-side)
    const fileName = `${template_type}_${tenantName.replace(/\s+/g, "_")}_${Date.now()}.txt`;
    const filePath = `${agency_id}/${fileName}`;
    
    // Upload the document content
    const encoder = new TextEncoder();
    const content = `${title}\n${"=".repeat(title.length)}\nDate: ${today}\n\n${body}`;
    
    const { error: uploadError } = await supabase.storage
      .from("agency-documents")
      .upload(filePath, encoder.encode(content), {
        contentType: "text/plain",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get the auth header to identify the user
    const authHeader = req.headers.get("Authorization") || "";
    let userId = tenant_id; // fallback
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) userId = user.id;
    }

    // Record in database
    await supabase.from("agency_generated_documents").insert({
      agency_id,
      template_type,
      tenant_id,
      file_path: filePath,
      file_name: fileName,
      generated_by: userId,
      metadata: { title, agency_name: agencyName, tenant_name: tenantName },
    });

    // Get signed URL for download
    const { data: urlData } = await supabase.storage
      .from("agency-documents")
      .createSignedUrl(filePath, 600);

    return new Response(JSON.stringify({
      success: true,
      signedUrl: urlData?.signedUrl,
      fileName,
      filePath,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-document error:", err);
    return new Response(JSON.stringify({ error: (err instanceof Error ? err.message : String(err)) || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
