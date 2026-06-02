// Parses a HUD PIC response file (CSV with error_code,error_message,record_id columns)
// and inserts per-record errors into agency_pic_record_errors.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (cols[i] || '').trim(); });
    return row;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') || '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { global: { headers: { Authorization: auth } } });
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ success: false, error: 'unauthorized' });

    const { submission_id, file_text, file_url } = await req.json();
    if (!submission_id || (!file_text && !file_url)) {
      return json({ success: false, error: 'submission_id and file_text or file_url required' });
    }

    let text = file_text || '';
    if (!text && file_url) {
      const r = await fetch(file_url);
      text = await r.text();
    }

    const rows = parseCsv(text);
    const errorRows = rows.filter(r => r.error_code || r.error_message);
    const accepted = rows.length - errorRows.length;

    if (errorRows.length > 0) {
      const inserts = errorRows.map(r => ({
        submission_id,
        record_id: r.record_id || null,
        error_code: r.error_code || 'UNKNOWN',
        error_message: r.error_message || '',
      }));
      const { error } = await sb.from('agency_pic_record_errors').insert(inserts);
      if (error) return json({ success: false, error: error.message });
    }

    await sb.from('agency_pic_submissions').update({
      error_count: errorRows.length,
      accepted_count: accepted,
      rejected_count: errorRows.length,
      record_count: rows.length,
      hud_response_received_at: new Date().toISOString(),
      hud_response_file_url: file_url || null,
      status: errorRows.length === 0 ? 'accepted' : (accepted === 0 ? 'rejected' : 'partial'),
    }).eq('id', submission_id);

    return json({ success: true, total: rows.length, accepted, errors: errorRows.length });
  } catch (e) {
    return json({ success: false, error: String(e) });
  }
});
