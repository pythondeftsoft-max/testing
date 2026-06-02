// Year-End Statement Bundle generator: combines monthly HAP statements + 1099 PDFs
// into a single combined PDF for a landlord per tax year.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getSupabase() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { landlord_id, tax_year } = await req.json();
    if (!landlord_id || !tax_year) {
      return new Response(JSON.stringify({ error: 'landlord_id and tax_year required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabase();
    const merged = await PDFDocument.create();
    const sources: string[] = [];

    // 1. Monthly HAP statements for the year
    const yearStart = `${tax_year}-01-01`;
    const yearEnd = `${tax_year}-12-31`;
    const { data: statements } = await supabase
      .from('landlord_hap_statements' as any)
      .select('id, file_path, statement_month')
      .eq('landlord_id', landlord_id)
      .gte('statement_month', yearStart)
      .lte('statement_month', yearEnd)
      .order('statement_month');

    for (const s of (statements || [])) {
      if (!(s as any).file_path) continue;
      try {
        const { data: blob } = await supabase.storage
          .from('landlord-statements')
          .download((s as any).file_path);
        if (!blob) continue;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach(p => merged.addPage(p));
        sources.push(`HAP statement ${(s as any).statement_month}`);
      } catch (err) {
        console.warn('Skipping unreadable statement', err);
      }
    }

    // 2. 1099 forms for the year
    const { data: forms } = await supabase
      .from('tax_forms_1099' as any)
      .select('id, pdf_url, form_type')
      .eq('payee_id', landlord_id)
      .eq('tax_year', tax_year);

    for (const f of (forms || [])) {
      const pdfUrl = (f as any).pdf_url;
      if (!pdfUrl) continue;
      try {
        // pdf_url stored as storage path "{landlord_id}/1099_..."
        const { data: blob } = await supabase.storage
          .from('tax-documents')
          .download(pdfUrl);
        if (!blob) continue;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach(p => merged.addPage(p));
        sources.push(`Form ${(f as any).form_type}`);
      } catch (err) {
        console.warn('Skipping unreadable 1099', err);
      }
    }

    if (merged.getPageCount() === 0) {
      // Add a placeholder page so download isn't empty
      const page = merged.addPage([612, 792]);
      page.drawText(`No tax documents found for ${tax_year}`, { x: 50, y: 720, size: 14 });
    }

    const out = await merged.save();
    const path = `${landlord_id}/yearend-bundle-${tax_year}.pdf`;
    const { error: upErr } = await supabase.storage
      .from('tax-documents')
      .upload(path, out, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw upErr;

    const { data: signed, error: signErr } = await supabase.storage
      .from('tax-documents')
      .createSignedUrl(path, 60 * 30);
    if (signErr) throw signErr;

    return new Response(JSON.stringify({
      success: true, path, signed_url: signed.signedUrl, pages: merged.getPageCount(), sources,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('generate-yearend-bundle', e);
    return new Response(JSON.stringify({ success: false, error: String((e as any)?.message || e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
