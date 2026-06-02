// Transmits a PIC/IMS submission file to HUD via SFTP.
// Uses per-agency SFTP overrides from agency_pic_settings or global secrets.
// Stores transmit_status, transmitted_at, transmit_log on agency_pic_submissions.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import SftpClient from 'npm:ssh2-sftp-client@10.0.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') || '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ success: false, error: 'unauthorized' });

    const { submission_id, dry_run } = await req.json();
    if (!submission_id) return json({ success: false, error: 'submission_id required' });

    const { data: sub, error: subErr } = await sb
      .from('agency_pic_submissions')
      .select('*')
      .eq('id', submission_id)
      .maybeSingle();
    if (subErr || !sub) return json({ success: false, error: subErr?.message || 'submission not found' });
    if (sub.transmitted_at) return json({ success: false, error: 'already transmitted' });
    if (!sub.file_name) return json({ success: false, error: 'submission has no file_name; generate file first' });

    const { data: settings } = await sb
      .from('agency_pic_settings')
      .select('*')
      .eq('agency_id', sub.agency_id)
      .maybeSingle();

    const host = settings?.sftp_host_override || Deno.env.get('PIC_SFTP_HOST');
    const username = settings?.sftp_user_override || Deno.env.get('PIC_SFTP_USER');
    const privateKey = Deno.env.get('PIC_SFTP_PRIVATE_KEY');
    if (!host || !username || !privateKey) {
      return json({ success: false, error: 'SFTP credentials not configured (PIC_SFTP_HOST/USER/PRIVATE_KEY)' });
    }

    // Pull file from storage
    const { data: file, error: fileErr } = await sb.storage
      .from('pic-submissions')
      .download(`${sub.agency_id}/${sub.file_name}`);
    if (fileErr || !file) return json({ success: false, error: `file fetch failed: ${fileErr?.message || 'not found'}` });
    const buf = new Uint8Array(await file.arrayBuffer());

    if (dry_run) {
      return json({ success: true, dry_run: true, file_size: buf.byteLength, host, username });
    }

    const sftp = new SftpClient();
    const log: string[] = [];
    try {
      await sftp.connect({ host, port: 22, username, privateKey });
      log.push(`connected to ${host} as ${username}`);
      const remotePath = `/inbox/${sub.file_name}`;
      await sftp.put(buf, remotePath);
      log.push(`uploaded ${buf.byteLength} bytes to ${remotePath}`);
      await sftp.end();
    } catch (e) {
      await sb
        .from('agency_pic_submissions')
        .update({
          transmit_status: 'failed',
          transmit_log: [...log, `error: ${String(e)}`].join('\n'),
        })
        .eq('id', submission_id);
      return json({ success: false, error: `SFTP failed: ${String(e)}` });
    }

    const nowIso = new Date().toISOString();
    await sb
      .from('agency_pic_submissions')
      .update({
        transmitted_at: nowIso,
        transmit_status: 'transmitted',
        transmit_log: log.join('\n'),
        status: sub.status === 'draft' ? 'uploaded' : sub.status,
        submitted_at: sub.submitted_at || nowIso,
      })
      .eq('id', submission_id);

    await sb.from('audit_logs').insert({
      user_id: u.user.id,
      action: 'pic_submission.transmitted',
      resource_type: 'agency_pic_submission',
      resource_id: submission_id,
      metadata: { host, file_name: sub.file_name },
    }).select().maybeSingle().catch(() => null);

    return json({ success: true, transmitted_at: nowIso });
  } catch (e) {
    return json({ success: false, error: String(e) });
  }
});
