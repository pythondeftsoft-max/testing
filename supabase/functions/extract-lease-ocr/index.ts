// Structured lease OCR — extracts rent terms, parties, dates and utility responsibility
// for use in RFTA / rent-reasonableness pre-fill.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GEMINI_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return ok({ success: false, error: 'Unauthorized' });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authErr || !user) return ok({ success: false, error: 'Invalid token' });

    if (!GEMINI_API_KEY) return ok({ success: false, error: 'AI service not configured' });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return ok({ success: false, error: 'No file provided' });
    if (file.size > 15 * 1024 * 1024) return ok({ success: false, error: 'File too large (max 15MB)' });

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    const base64Data = btoa(binary);
    const mimeType = file.type || 'application/pdf';

    const prompt = `You are a residential lease analyst for a public housing authority.
Extract the key contract terms from this lease document.

Return JSON with EXACTLY this shape:
{
  "tenant_names": string[],
  "landlord_name": string,
  "landlord_phone": string,
  "landlord_email": string,
  "property_address": string,
  "unit_number": string,
  "city": string,
  "state": string,
  "zip": string,
  "monthly_rent": number,
  "security_deposit": number,
  "pet_deposit": number,
  "lease_start_date": "YYYY-MM-DD" | null,
  "lease_end_date": "YYYY-MM-DD" | null,
  "term_months": number,
  "bedroom_count": number | null,
  "bathroom_count": number | null,
  "utilities_paid_by_tenant": string[],
  "utilities_paid_by_landlord": string[],
  "appliances_provided": string[],
  "late_fee": number,
  "confidence": {
    "monthly_rent": "high"|"medium"|"low",
    "lease_start_date": "high"|"medium"|"low",
    "lease_end_date": "high"|"medium"|"low",
    "property_address": "high"|"medium"|"low"
  },
  "warnings": string[]
}

Use 0 for unreadable numbers, "" for unreadable strings, and [] for unreadable arrays.
Normalize utility names to: electric, gas, water, sewer, trash, internet, cable, heat.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Data } },
            ],
          }],
          generationConfig: { temperature: 0.05, responseMimeType: 'application/json' },
        }),
      },
    );

    if (!geminiRes.ok) {
      console.error('gemini error', await geminiRes.text());
      return ok({ success: false, error: 'AI processing failed' });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return ok({ success: false, error: 'No data extracted' });

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return ok({ success: false, error: 'Failed to parse AI response' });
    }

    return ok({
      success: true,
      data: { ...parsed, file_name: file.name },
    });
  } catch (e) {
    console.error('extract-lease-ocr', e);
    return ok({ success: false, error: 'Internal error' });
  }
});
