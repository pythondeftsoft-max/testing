import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createResendClient } from "../_shared/resend.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), {
  status: s, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

const FROM = Deno.env.get('INVITES_FROM_EMAIL') ?? 'notifications@openkeyhousing.com';
const APP_URL = 'https://openkeyhousing.com';

function buildEmail(opts: { recipientName?: string; incident: any; ackUrl: string }) {
  const { recipientName, incident, ackUrl } = opts;
  const date = new Date(incident.discovered_at ?? incident.created_at).toLocaleDateString('en-US');
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;">
      <h2 style="color:#b91c1c;">Important Security Notice</h2>
      <p>Dear ${recipientName || 'Resident'},</p>
      <p>We are writing to inform you of a security incident that may have affected your personal information held by our agency.</p>
      <h3>What happened</h3>
      <p><strong>Incident date:</strong> ${date}<br/>
      <strong>Incident:</strong> ${incident.title}</p>
      <p>${incident.description ?? ''}</p>
      <h3>What information was involved</h3>
      <p>${incident.pii_exposed ? 'Personally identifiable information (PII) you provided to us as part of your housing assistance file may have been exposed.' : 'Limited account information may have been involved. No financial or Social Security data was exposed.'}</p>
      <h3>What we are doing</h3>
      <p>We have contained the incident and are conducting a full review with our security team. We have notified HUD and applicable state authorities as required.</p>
      <h3>What you can do</h3>
      <ul>
        <li>Monitor your accounts and credit reports for unusual activity.</li>
        <li>Place a free fraud alert with the credit bureaus if you wish.</li>
        <li>Contact us with any questions or concerns.</li>
      </ul>
      <p style="margin:24px 0;">
        <a href="${ackUrl}" style="background:#1d4ed8;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Acknowledge receipt of this notice</a>
      </p>
      <p style="font-size:12px;color:#6b7280;">Reference incident ID: ${incident.id}</p>
    </div>`;
  return html;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const auth = req.headers.get('authorization');
    if (!auth) return json({ success: false, error: 'No auth' });
    const { data: { user } } = await supabase.auth.getUser(auth.replace('Bearer ', ''));
    if (!user) return json({ success: false, error: 'Unauthorized' });
    const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) return json({ success: false, error: 'Admin only' });

    const { incidentId } = await req.json();
    if (!incidentId) return json({ success: false, error: 'incidentId required' });

    const { data: incident, error } = await supabase
      .from('security_incidents').select('*').eq('id', incidentId).maybeSingle();
    if (error || !incident) return json({ success: false, error: 'Incident not found' });
    if (!['high', 'critical'].includes((incident as any).severity)) {
      return json({ success: false, error: 'Only high/critical incidents trigger breach notifications' });
    }

    const affected: string[] = (incident as any).affected_user_ids ?? [];
    if (!affected.length) return json({ success: false, error: 'No affected users selected' });

    // Fetch profiles for affected users
    const { data: profiles } = await supabase
      .from('profiles').select('id, full_name, email').in('id', affected);

    const resend = createResendClient();
    let sent = 0; const errors: string[] = [];

    for (const p of profiles ?? []) {
      const prof = p as any;
      if (!prof.email) continue;

      // Insert pending notification (token is auto-generated)
      const { data: notif, error: nErr } = await supabase.from('breach_notifications')
        .insert({ incident_id: incidentId, user_id: prof.id, recipient_email: prof.email,
                  recipient_name: prof.full_name, delivery_status: 'pending' } as any)
        .select('id, acknowledgement_token').maybeSingle();
      if (nErr || !notif) { errors.push(`db: ${nErr?.message}`); continue; }
      const ackUrl = `${APP_URL}/security/breach-acknowledge?token=${(notif as any).acknowledgement_token}`;

      const html = buildEmail({ recipientName: prof.full_name, incident, ackUrl });
      const { error: sErr } = await resend.emails.send({
        from: `Security Notice <${FROM}>`, to: prof.email,
        subject: `Important Security Notice — ${incident.title}`, html,
      });

      if (sErr) {
        await supabase.from('breach_notifications')
          .update({ delivery_status: 'failed', delivery_error: sErr.message } as any)
          .eq('id', (notif as any).id);
        errors.push(`${prof.email}: ${sErr.message}`);
      } else {
        await supabase.from('breach_notifications')
          .update({ delivery_status: 'sent', sent_at: new Date().toISOString() } as any)
          .eq('id', (notif as any).id);
        sent++;
      }
    }

    await supabase.from('security_incidents').update({
      notification_sent_at: new Date().toISOString(),
      notification_recipient_count: sent,
      breach_notified_at: new Date().toISOString(),
    } as any).eq('id', incidentId);

    await supabase.from('pii_access_log').insert({
      actor_id: user.id, purpose: 'breach_notification',
      accessed_fields: ['email'], context: { incidentId, sent, errors },
    } as any);

    return json({ success: true, sent, errors });
  } catch (e: any) {
    console.error('breach-notify error', e);
    return json({ success: false, error: e.message ?? 'Internal error' });
  }
});
