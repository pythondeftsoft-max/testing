import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

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

    const { requestId } = await req.json();
    if (!requestId) return json({ success: false, error: 'requestId required' });

    const { data: dsar, error: dErr } = await supabase
      .from('dsar_requests').select('*').eq('id', requestId).maybeSingle();
    if (dErr || !dsar) return json({ success: false, error: 'DSAR not found' });

    const targetEmail: string = (dsar as any).requester_email;
    const targetUserId: string | null = (dsar as any).requester_user_id ?? null;
    const requestType: string = (dsar as any).request_type;

    // Resolve target user id from email if not present
    let userId = targetUserId;
    if (!userId && targetEmail) {
      const { data: profMatch } = await supabase
        .from('profiles').select('id').eq('email', targetEmail).maybeSingle();
      userId = (profMatch as any)?.id ?? null;
    }

    // Legal hold check (function exists from earlier migration)
    let legallyHeld = false;
    if (userId) {
      const { data: held } = await supabase.rpc('is_legally_held', {
        _table: 'profiles', _record_id: userId,
      }).maybeSingle();
      legallyHeld = !!held;
    }

    if (requestType === 'delete' && legallyHeld) {
      await supabase.from('dsar_requests').update({
        status: 'pending_legal_review',
        denial_reason: 'Record is under active legal hold; deletion blocked until hold released.',
      }).eq('id', requestId);
      return json({ success: false, error: 'Legal hold prevents deletion. Status updated.' });
    }

    if (requestType === 'export') {
      const bundle: Record<string, unknown> = {
        generated_at: new Date().toISOString(),
        subject: { user_id: userId, email: targetEmail },
        request: dsar,
      };

      const tables = [
        'profiles', 'tenant_section8_data', 'agency_vouchers', 'voucher_applications',
        'agency_repayment_agreements', 'agency_reasonable_accommodations',
        'agency_communications', 'pii_access_log',
      ];
      for (const t of tables) {
        try {
          const { data: rows } = await supabase.from(t as any).select('*')
            .or(`user_id.eq.${userId},tenant_id.eq.${userId},subject_user_id.eq.${userId}`)
            .limit(500);
          bundle[t] = rows ?? [];
        } catch { bundle[t] = []; }
      }

      const path = `${requestId}/export-${Date.now()}.json`;
      const { error: upErr } = await supabase.storage.from('dsar-exports').upload(
        path, new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }),
        { upsert: true, contentType: 'application/json' });
      if (upErr) return json({ success: false, error: `Upload failed: ${upErr.message}` });

      const { data: signed, error: sErr } = await supabase.storage.from('dsar-exports')
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (sErr) return json({ success: false, error: `Sign failed: ${sErr.message}` });

      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('dsar_requests').update({
        status: 'fulfilled', fulfilled_at: new Date().toISOString(),
        fulfillment_url: signed.signedUrl, fulfillment_expires_at: expires,
        fulfilled_by: user.id, auto_fulfilled: true,
      }).eq('id', requestId);

      await supabase.from('pii_access_log').insert({
        actor_id: user.id, subject_user_id: userId, purpose: 'dsar_fulfillment',
        accessed_fields: ['export_bundle'], context: { requestId, recordCount: Object.keys(bundle).length },
      } as any);

      return json({ success: true, url: signed.signedUrl, expires_at: expires });
    }

    if (requestType === 'delete') {
      // Soft anonymization of profile
      if (userId) {
        await supabase.from('profiles').update({
          full_name: 'REDACTED', email: `redacted-${userId}@deleted.local`, phone: null, avatar_url: null,
        } as any).eq('id', userId);
      }
      await supabase.from('dsar_requests').update({
        status: 'fulfilled', fulfilled_at: new Date().toISOString(),
        fulfilled_by: user.id, auto_fulfilled: true,
      }).eq('id', requestId);
      await supabase.from('pii_access_log').insert({
        actor_id: user.id, subject_user_id: userId, purpose: 'dsar_fulfillment',
        accessed_fields: ['profile_anonymized'], context: { requestId, action: 'delete' },
      } as any);
      return json({ success: true, message: 'Profile anonymized.' });
    }

    return json({ success: false, error: `Auto-fulfillment not supported for type: ${requestType}` });
  } catch (e: any) {
    console.error('dsar-fulfill error', e);
    return json({ success: false, error: e.message ?? 'Internal error' });
  }
});
