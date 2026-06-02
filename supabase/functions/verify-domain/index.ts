import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { domain, verification_token } = await req.json();

    if (!domain || !verification_token) {
      return new Response(
        JSON.stringify({ error: 'Domain and verification token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying domain: ${domain} with token: ${verification_token}`);

    // Check DNS TXT record using Cloudflare DNS
    const dnsUrl = `https://cloudflare-dns.com/dns-query?name=_wl-verification.${domain}&type=TXT`;
    
    let isVerified = false;
    let dnsError = null;

    try {
      const dnsResponse = await fetch(dnsUrl, {
        headers: {
          'Accept': 'application/dns-json',
        },
      });

      const dnsData = await dnsResponse.json();
      
      if (dnsData.Answer) {
        for (const record of dnsData.Answer) {
          if (record.data && record.data.includes(`wl-verification=${verification_token}`)) {
            isVerified = true;
            break;
          }
        }
      }
    } catch (error) {
      console.error('DNS lookup error:', error);
      dnsError = 'Failed to perform DNS lookup';
    }

    // Create or update domain verification record
    const verificationData = {
      domain,
      verification_token,
      verification_status: isVerified ? 'verified' : 'failed',
      verified_at: isVerified ? new Date().toISOString() : null,
      verification_attempts: 1,
      last_checked_at: new Date().toISOString(),
    };

    const { data: existingRecord } = await supabase
      .from('domain_verifications')
      .select('id, verification_attempts')
      .eq('domain', domain)
      .single();

    if (existingRecord) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('domain_verifications')
        .update({
          ...verificationData,
          verification_attempts: (existingRecord.verification_attempts || 0) + 1,
        })
        .eq('id', existingRecord.id);

      if (updateError) {
        console.error('Error updating domain verification:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update domain verification' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('domain_verifications')
        .insert(verificationData);

      if (insertError) {
        console.error('Error creating domain verification:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create domain verification' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update domain verification status in the white_label_configs table
    const { error: configUpdateError } = await supabase
      .from('white_label_configs')
      .update({
        domain_verification_status: isVerified ? 'verified' : 'failed'
      })
      .eq('custom_domain', domain)
      .eq('user_id', user.id);

    if (configUpdateError) {
      console.error('Error updating white label config verification status:', configUpdateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: isVerified,
        message: isVerified 
          ? 'Domain verified successfully!' 
          : dnsError || 'Domain verification failed. Please check your DNS record.',
        txtRecord: {
          name: `_wl-verification.${domain}`,
          value: `wl-verification=${verification_token}`,
          type: 'TXT'
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Domain verification error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        message: (error instanceof Error ? error.message : String(error)) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});