// Structured pay-stub OCR. Wraps Gemini vision and returns
// normalized income fields with confidence + annualization estimate.
// Caseworker-facing — always require an authenticated session.
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

function annualize(gross: number, frequency: string): number {
  if (!gross || !isFinite(gross)) return 0;
  const f = (frequency || '').toLowerCase();
  if (f.includes('week') && f.includes('bi')) return Math.round(gross * 26);
  if (f.includes('week')) return Math.round(gross * 52);
  if (f.includes('semi') || f.includes('twice')) return Math.round(gross * 24);
  if (f.includes('month')) return Math.round(gross * 12);
  if (f.includes('annual') || f.includes('year')) return Math.round(gross);
  return Math.round(gross * 26); // default biweekly
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
    if (file.size > 10 * 1024 * 1024) return ok({ success: false, error: 'File too large (max 10MB)' });

    const arrayBuffer = await file.arrayBuffer();
    // Chunked base64 encoding to avoid stack overflow on large files
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    const base64Data = btoa(binary);
    const mimeType = file.type || 'application/pdf';

    const prompt = `You are an income document analyst for a public housing authority.
Extract structured data from this pay stub image.

Return JSON with EXACTLY this shape:
{
  "employer_name": string,
  "employee_name": string,
  "pay_period_start": "YYYY-MM-DD" | null,
  "pay_period_end": "YYYY-MM-DD" | null,
  "pay_date": "YYYY-MM-DD" | null,
  "gross_pay": number,
  "net_pay": number,
  "ytd_gross": number,
  "ytd_net": number,
  "pay_frequency": "weekly" | "biweekly" | "semi-monthly" | "monthly" | "annual" | "unknown",
  "hours_worked": number | null,
  "hourly_rate": number | null,
  "confidence": {
    "employer_name": "high"|"medium"|"low",
    "gross_pay": "high"|"medium"|"low",
    "net_pay": "high"|"medium"|"low",
    "ytd_gross": "high"|"medium"|"low",
    "pay_frequency": "high"|"medium"|"low"
  },
  "warnings": string[]
}

Use 0 for unreadable numeric fields and "" for unreadable strings. Be precise — include cents.
If multiple pay periods are shown, use the MOST RECENT one.`;

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

    const annual_estimate = annualize(Number(parsed.gross_pay) || 0, parsed.pay_frequency || '');

    return ok({
      success: true,
      data: {
        ...parsed,
        annual_gross_estimate: annual_estimate,
        file_name: file.name,
      },
    });
  } catch (e) {
    console.error('extract-paystub-ocr', e);
    return ok({ success: false, error: 'Internal error' });
  }
});
