import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ExtractedField {
  field: string;
  value: string;
  confidence: "high" | "medium" | "low";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid token" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "AI service not configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docType = formData.get("document_type") as string || "general";

    if (!file) {
      return new Response(JSON.stringify({ success: false, error: "No file provided" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read file as base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const mimeType = file.type || "application/pdf";

    // Build prompt based on document type
    const fieldInstructions: Record<string, string> = {
      pay_stub: `Extract: employer_name, employee_name, pay_period_start, pay_period_end, gross_pay, net_pay, ytd_gross, pay_frequency (weekly/biweekly/monthly)`,
      lease: `Extract: tenant_name, landlord_name, property_address, monthly_rent, lease_start_date, lease_end_date, security_deposit, utility_responsibilities`,
      utility_bill: `Extract: account_holder_name, service_address, billing_period, amount_due, utility_type (electric/gas/water/sewer)`,
      bank_statement: `Extract: account_holder_name, bank_name, statement_period, ending_balance, total_deposits, total_withdrawals`,
      general: `Extract all relevant fields: names, dates, addresses, monetary amounts, account numbers, and any other important data points`,
    };

    const prompt = `You are a document data extraction assistant for a housing authority. Analyze this document image and extract structured data.

Document type: ${docType}
${fieldInstructions[docType] || fieldInstructions.general}

Return a JSON object with this exact structure:
{
  "document_type_detected": "string describing what the document appears to be",
  "fields": [
    { "field": "field_name", "value": "extracted value", "confidence": "high|medium|low" }
  ],
  "warnings": ["any issues or concerns about the document"]
}

Be precise with monetary values (include decimals). Use ISO format for dates (YYYY-MM-DD). If a field cannot be read, still include it with value "UNREADABLE" and confidence "low".`;

    // Call Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Data } },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      return new Response(JSON.stringify({ success: false, error: "AI processing failed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiRes.json();
    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return new Response(JSON.stringify({ success: false, error: "No data extracted from document" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(textContent);
    } catch {
      console.error("Failed to parse Gemini response:", textContent);
      return new Response(JSON.stringify({ success: false, error: "Failed to parse AI response" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        document_type_detected: parsed.document_type_detected || docType,
        fields: parsed.fields || [],
        warnings: parsed.warnings || [],
        file_name: file.name,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("parse-document-ai error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
