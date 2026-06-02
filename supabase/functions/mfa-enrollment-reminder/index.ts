import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REMINDER_THROTTLE_DAYS = 7;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Find privileged roles with enforcement enabled
    const { data: enforcedRoles, error: cfgErr } = await supabase
      .from('mfa_enforcement_config')
      .select('role_name')
      .eq('required', true);
    if (cfgErr) throw cfgErr;

    const enforcedRoleNames = (enforcedRoles ?? []).map((r) => r.role_name);

    // 2. Build candidate user list (privileged users regardless of enforcement,
    //    but we only nudge if their role IS enforced — otherwise spam).
    if (enforcedRoleNames.length === 0) {
      return jsonOk({ success: true, reminded: 0, reason: 'no_enforced_roles' });
    }

    // Platform roles (admin / system_admin)
    const platformPrivileged = ['admin', 'system_admin'].filter((r) =>
      enforcedRoleNames.includes(r),
    );
    const agencyPrivileged = enforcedRoleNames.filter(
      (r) => !['admin', 'system_admin'].includes(r),
    );

    const userIds = new Set<string>();

    if (platformPrivileged.length > 0) {
      const { data: rows } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', platformPrivileged);
      (rows ?? []).forEach((r: any) => r.user_id && userIds.add(r.user_id));
    }

    if (agencyPrivileged.length > 0) {
      const { data: rows } = await supabase
        .from('agency_staff')
        .select('user_id')
        .in('role', agencyPrivileged)
        .eq('is_active', true);
      (rows ?? []).forEach((r: any) => r.user_id && userIds.add(r.user_id));
    }

    if (userIds.size === 0) {
      return jsonOk({ success: true, reminded: 0, reason: 'no_users' });
    }

    // 3. Filter out users already enrolled or recently reminded
    const userIdArray = Array.from(userIds);
    const { data: mfaRows } = await supabase
      .from('user_mfa_settings')
      .select('user_id, enrolled_at, last_reminder_sent_at')
      .in('user_id', userIdArray);

    const mfaMap = new Map<string, { enrolled_at: string | null; last_reminder_sent_at: string | null }>();
    (mfaRows ?? []).forEach((r: any) => mfaMap.set(r.user_id, r));

    const throttleCutoff = Date.now() - REMINDER_THROTTLE_DAYS * 24 * 60 * 60 * 1000;
    const toRemind = userIdArray.filter((uid) => {
      const m = mfaMap.get(uid);
      if (m?.enrolled_at) return false; // already enrolled
      if (m?.last_reminder_sent_at) {
        const last = new Date(m.last_reminder_sent_at).getTime();
        if (last > throttleCutoff) return false; // reminded too recently
      }
      return true;
    });

    if (toRemind.length === 0) {
      return jsonOk({ success: true, reminded: 0, reason: 'all_throttled_or_enrolled' });
    }

    // 4. Look up profile emails
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, email')
      .in('id', toRemind);

    let reminded = 0;
    const nowIso = new Date().toISOString();

    for (const profile of profiles ?? []) {
      if (!profile.email) continue;
      const firstName = profile.first_name || 'there';

      const subject = 'Action required: Set up multi-factor authentication';
      const body = `
Hi ${firstName},

Your role on OpenKey now requires multi-factor authentication (MFA) for additional account security.

Please take 2 minutes to set it up now:
https://openkeyhousing.com/account/security

You'll be guided through scanning a QR code with your authenticator app and saving backup codes.

Until you enroll, you'll be prompted to set up MFA the next time you sign in.

Thanks,
The OpenKey Security Team
      `.trim();

      const { error: queueErr } = await supabase.from('email_queue').insert({
        user_id: profile.id,
        subject,
        body,
        to_email: profile.email,
        status: 'pending',
        template_slug: 'mfa_enrollment_reminder',
        category: 'security',
        metadata: { kind: 'mfa_reminder' },
      });

      if (queueErr) {
        console.error('Failed to queue reminder for', profile.id, queueErr);
        continue;
      }

      // Upsert last_reminder_sent_at
      await supabase.from('user_mfa_settings').upsert(
        {
          user_id: profile.id,
          last_reminder_sent_at: nowIso,
          backup_codes_remaining: 0,
        },
        { onConflict: 'user_id' },
      );

      reminded++;
    }

    return jsonOk({ success: true, reminded, candidates: toRemind.length });
  } catch (e: any) {
    console.error('mfa-enrollment-reminder error:', e);
    return jsonOk({ success: false, error: e?.message ?? String(e) });
  }
});

function jsonOk(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
