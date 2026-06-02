// Public landlord application submission endpoint (Pass 2 — landlord parity)
// No JWT required.
// Three states (mirroring submit-public-waitlist-application):
//   A) Anonymous, NO existing OpenKey account → insert agency_landlords row + claim_token
//   B) Anonymous, email matches existing user → attach landlord_user_id, no claim needed
//   C) Authenticated → attach immediately + create agency_landlord_links row
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Payload {
  agency_slug: string;
  landlord_name: string;
  landlord_email: string;
  phone?: string;
  business_name?: string;
  ein?: string;
  property_addresses?: string[];
  notes?: string;
  consent: boolean;
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
    const payload = (await req.json()) as Payload;

    const errors: string[] = [];
    if (!payload?.agency_slug) errors.push('agency_slug required');
    if (!payload?.landlord_name?.trim()) errors.push('landlord_name required');
    if (!payload?.landlord_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.landlord_email)) errors.push('valid email required');
    if (!payload?.consent) errors.push('consent required');
    if (errors.length) return ok({ success: false, error: errors.join(', ') });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: agency } = await supabase
      .from('housing_authorities')
      .select('id, name, slug, is_active')
      .eq('slug', payload.agency_slug)
      .maybeSingle();
    if (!agency || !agency.is_active) return ok({ success: false, error: 'Agency not found' });

    const cleanEmail = payload.landlord_email.trim().toLowerCase().slice(0, 255);

    // C) Authed?
    let authedUserId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (userData?.user?.id) authedUserId = userData.user.id;
    }

    // B) Match by email
    let attachedUserId: string | null = authedUserId;
    if (!attachedUserId) {
      const { data: existingUid } = await supabase.rpc('find_user_by_email', { _email: cleanEmail });
      if (existingUid) attachedUserId = existingUid as string;
    }

    // Dedupe: same email + same agency = update, not insert
    const { data: existing } = await supabase
      .from('agency_landlords')
      .select('id, claimed_at, claim_token')
      .eq('agency_id', agency.id)
      .eq('landlord_email', cleanEmail)
      .maybeSingle();

    const needsClaim = !authedUserId;
    const claimToken = needsClaim && !existing?.claimed_at ? (existing?.claim_token || genToken()) : null;

    let landlordRowId: string;
    if (existing) {
      const { error: updErr } = await supabase
        .from('agency_landlords')
        .update({
          landlord_name: payload.landlord_name.trim().slice(0, 200),
          notes: payload.notes?.trim().slice(0, 2000) || null,
          landlord_user_id: attachedUserId,
          claim_token: claimToken,
          claim_token_expires_at: claimToken ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
          claimed_at: authedUserId ? new Date().toISOString() : existing.claimed_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (updErr) return ok({ success: false, error: 'Could not update landlord record' });
      landlordRowId = existing.id;
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('agency_landlords')
        .insert({
          agency_id: agency.id,
          landlord_name: payload.landlord_name.trim().slice(0, 200),
          landlord_email: cleanEmail,
          notes: payload.notes?.trim().slice(0, 2000) || null,
          onboarding_status: 'pending_review',
          landlord_user_id: attachedUserId,
          claim_token: claimToken,
          claim_token_expires_at: claimToken ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
          claimed_at: authedUserId ? new Date().toISOString() : null,
        })
        .select('id')
        .single();
      if (insErr) {
        console.error('landlord insert', insErr);
        return ok({ success: false, error: 'Could not save landlord application' });
      }
      landlordRowId = inserted.id;
    }

    if (authedUserId) {
      await supabase.from('agency_landlord_links').upsert({
        user_id: authedUserId,
        agency_id: agency.id,
        landlord_id: landlordRowId,
        status: 'pending',
        role: 'owner',
        source: 'self_apply',
        metadata: { merge_pending: true, attached_inline: true },
      }, { onConflict: 'user_id,agency_id,landlord_id' });
    }

    // Confirmation / invite email (non-fatal)
    try {
      const baseUrl = req.headers.get('origin') || 'https://openkeyhousing.com';
      const claimUrl = claimToken ? `${baseUrl}/claim/${claimToken}` : null;
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'landlord-application-confirmation',
          recipientEmail: cleanEmail,
          idempotencyKey: `landlord-app-${landlordRowId}`,
          templateData: {
            landlordName: payload.landlord_name,
            agencyName: agency.name,
            claimUrl,
            existingUser: !!(attachedUserId && !authedUserId),
            authedAlready: !!authedUserId,
          },
        },
      });
    } catch (e) {
      console.error('email failed (non-fatal)', e);
    }

    return ok({
      success: true,
      landlord_id: landlordRowId,
      agency_name: agency.name,
      requires_claim: needsClaim && !!claimToken,
      attached_existing_user: !!(attachedUserId && !authedUserId),
    });
  } catch (e) {
    console.error('unhandled', e);
    return ok({ success: false, error: 'Unexpected error' });
  }
});
