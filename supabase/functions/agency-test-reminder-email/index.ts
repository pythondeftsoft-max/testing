import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SAMPLES: Record<string, { subject: string; body: string; slug: string }> = {
  recertification_30day: { subject: 'TEST: Recertification Reminder', body: 'Sample — Your annual recertification is due in 30 days.', slug: 'recertification_reminder' },
  recertification_60day: { subject: 'TEST: Recertification Reminder', body: 'Sample — Your annual recertification is due in 60 days.', slug: 'recertification_reminder' },
  recertification_90day: { subject: 'TEST: Recertification Reminder', body: 'Sample — Your annual recertification is due in 90 days.', slug: 'recertification_reminder' },
  inspection_upcoming: { subject: 'TEST: Inspection Reminder', body: 'Sample — Housing inspection scheduled.', slug: 'inspection_reminder' },
  lease_expiration: { subject: 'TEST: Lease Expiration', body: 'Sample — Your lease is expiring soon.', slug: 'lease_expiration' },
  hap_contract_expiration: { subject: 'TEST: HAP Contract Expiring', body: 'Sample — HAP contract expires soon.', slug: 'hap_expiration' },
  voucher_issued: { subject: 'TEST: Voucher Shopping Deadline', body: 'Sample — Your voucher shopping deadline is approaching.', slug: 'voucher_issued' },
  rent_change: { subject: 'TEST: Rent Change Notice', body: 'Sample — Your rent portion is changing.', slug: 'rent_change' },
  document_expiration: { subject: 'TEST: Document Expiring', body: 'Sample — A compliance document is expiring soon.', slug: 'document_expiration' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { reminderType, agencyId, recipientEmail } = await req.json();
    const sample = SAMPLES[reminderType];
    if (!sample) {
      return new Response(JSON.stringify({ success: false, error: `Unknown reminder type: ${reminderType}` }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const toEmail = recipientEmail || user.email;
    if (!toEmail) {
      return new Response(JSON.stringify({ success: false, error: 'No recipient email available' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let agencyMeta: { name?: string; email?: string } = {};
    if (agencyId) {
      const { data: a } = await supabase.from('housing_authorities').select('name, email').eq('id', agencyId).single();
      if (a) agencyMeta = { name: a.name, email: a.email };
    }

    const { error } = await supabase.from('email_queue').insert({
      user_id: user.id,
      subject: sample.subject,
      body: sample.body,
      to_email: toEmail,
      status: 'pending',
      template_slug: sample.slug,
      category: 'agency_reminder_test',
      metadata: { agency_id: agencyId, from_email: agencyMeta.email, from_name: agencyMeta.name, test: true },
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, sent_to: toEmail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Test reminder error:', error);
    return new Response(JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
