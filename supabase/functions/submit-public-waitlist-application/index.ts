// Public waitlist application submission endpoint
// No JWT required — applicants are unauthenticated members of the public.
// Handles three states:
//   A) Anonymous, NO existing OpenKey account → insert applicant + emit claim_token
//   B) Anonymous, email matches existing user → attach tenant_user_id, no claim needed
//   C) Authenticated (Authorization header w/ valid JWT) → attach immediately, create agency_tenant_links
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SubmissionPayload {
  agency_slug: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  current_address?: string;
  household_size?: number;
  annual_income?: number;
  housing_type_requested?: string;
  special_needs?: string;
  preference_categories?: string[];
  household_data?: unknown;
  address_history?: unknown;
  preferences?: unknown;
  demographics?: unknown;
  consent: boolean;
  intake_mode?: 'waitlist' | 'direct';
}

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function genToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') return ok({ success: false, error: 'Method not allowed' });

    const payload = (await req.json()) as SubmissionPayload;

    const errors: string[] = [];
    if (!payload?.agency_slug) errors.push('agency_slug required');
    if (!payload?.first_name?.trim()) errors.push('first_name required');
    if (!payload?.last_name?.trim()) errors.push('last_name required');
    if (!payload?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) errors.push('valid email required');
    if (!payload?.consent) errors.push('consent required');
    if (errors.length) return ok({ success: false, error: errors.join(', ') });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: agency, error: agencyError } = await supabase
      .from('housing_authorities')
      .select('id, name, slug, public_waitlist_open, direct_apply_open, is_active')
      .eq('slug', payload.agency_slug)
      .maybeSingle();
    if (agencyError) return ok({ success: false, error: 'Could not look up agency' });
    if (!agency || !agency.is_active) return ok({ success: false, error: 'Agency not found' });

    const wantsDirect = payload.intake_mode === 'direct';
    const intakeMode = wantsDirect && agency.direct_apply_open ? 'direct_apply' : 'waitlist';
    if (intakeMode === 'waitlist' && !agency.public_waitlist_open) {
      return ok({ success: false, error: 'This agency is not currently accepting public applications.' });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || null;
    const userAgent = req.headers.get('user-agent');
    const cleanEmail = payload.email.trim().toLowerCase().slice(0, 255);

    // ---- State detection ----
    // C) Authenticated user?
    let authedUserId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (userData?.user?.id) authedUserId = userData.user.id;
    }

    // B) If anonymous, look up existing user by email (to attach instead of duplicate)
    let attachedUserId: string | null = authedUserId;
    if (!attachedUserId) {
      const { data: existingUid } = await supabase.rpc('find_user_by_email', { _email: cleanEmail });
      if (existingUid) attachedUserId = existingUid as string;
    }

    // Application number
    const { data: appNumberData, error: numErr } = await supabase
      .rpc('next_application_number', { p_agency_id: agency.id });
    if (numErr) return ok({ success: false, error: 'Could not allocate application number' });
    const application_number = appNumberData as string;

    // Generate claim token unless we're sure no claim step is needed (authed user)
    const needsClaim = !authedUserId; // If authed, agency_tenant_links is created server-side now; no claim email
    const claimToken = needsClaim ? genToken() : null;

    const { data: app, error: insertErr } = await supabase
      .from('voucher_applications')
      .insert({
        agency_id: agency.id,
        first_name: payload.first_name.trim().slice(0, 100),
        last_name: payload.last_name.trim().slice(0, 100),
        email: cleanEmail,
        phone: payload.phone?.trim().slice(0, 50) || null,
        date_of_birth: payload.date_of_birth || null,
        current_address: payload.current_address?.trim().slice(0, 500) || null,
        household_size: Number(payload.household_size) || 1,
        annual_income: payload.annual_income ? Number(payload.annual_income) : null,
        housing_type_requested: payload.housing_type_requested?.slice(0, 100) || null,
        special_needs: payload.special_needs?.trim().slice(0, 1000) || null,
        preference_categories: payload.preference_categories || null,
        status: 'pending',
        application_number,
        submission_source: 'public',
        submission_ip: ip,
        submitted_household_data: payload.household_data ?? null,
        submitted_address_history: payload.address_history ?? null,
        submitted_preferences: payload.preferences ?? null,
        submitted_demographics: payload.demographics ?? null,
        intake_mode: intakeMode,
        tenant_user_id: attachedUserId,
        claim_token: claimToken,
        claim_token_expires_at: claimToken ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        claimed_at: authedUserId ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('insert error', insertErr);
      return ok({ success: false, error: 'Could not save application' });
    }

    // If authenticated, create the agency_tenant_links row immediately
    if (authedUserId) {
      const linkStatus = intakeMode === 'direct_apply' ? 'applied' : 'waitlisted';
      await supabase.from('agency_tenant_links').upsert({
        user_id: authedUserId,
        agency_id: agency.id,
        status: linkStatus,
        source: 'self_apply_pha',
        application_id: app.id,
        metadata: { merge_pending: true, attached_inline: true },
      }, { onConflict: 'user_id,agency_id' });
    }

    // Audit log
    await supabase.from('public_waitlist_submissions').insert({
      agency_id: agency.id,
      application_id: app.id,
      ip_address: ip,
      user_agent: userAgent,
      email: cleanEmail,
      status: 'submitted',
    });

    // Confirmation / claim email (non-fatal)
    try {
      const baseUrl = req.headers.get('origin') || 'https://openkeyhousing.com';
      const claimUrl = claimToken ? `${baseUrl}/claim/${claimToken}` : null;
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'waitlist-application-confirmation',
          recipientEmail: cleanEmail,
          idempotencyKey: `waitlist-${app.id}`,
          templateData: {
            applicantName: payload.first_name,
            applicationNumber: application_number,
            agencyName: agency.name,
            claimUrl, // template can render "Create your OpenKey account" CTA when present
            existingUser: !!(attachedUserId && !authedUserId), // tells email to say "Sign in to confirm"
            authedAlready: !!authedUserId,
          },
        },
      });
    } catch (e) {
      console.error('confirmation email failed (non-fatal)', e);
    }

    return ok({
      success: true,
      application_number,
      application_id: app.id,
      agency_name: agency.name,
      requires_claim: needsClaim,
      attached_existing_user: !!(attachedUserId && !authedUserId),
    });
  } catch (e) {
    console.error('unhandled', e);
    return ok({ success: false, error: 'Unexpected error' });
  }
});
