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

    const { domain, verification_token, verification_id } = await req.json();

    if (!domain || !verification_token || !verification_id) {
      return new Response(
        JSON.stringify({ error: 'Domain, verification token, and verification ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Re-verifying domain: ${domain} with token: ${verification_token}`);

    // Increment verification attempts
    // First, get the current verification attempts count
    const { data: currentVerification, error: fetchError } = await supabase
      .from('domain_verifications')
      .select('verification_attempts')
      .eq('id', verification_id)
      .single();

    if (fetchError) {
      console.error('Error fetching verification data:', fetchError);
    }

    // Increment the attempts counter
    const currentAttempts = currentVerification?.verification_attempts || 0;
    const { error: incrementError } = await supabase
      .from('domain_verifications')
      .update({
        verification_attempts: currentAttempts + 1,
        last_checked_at: new Date().toISOString(),
      })
      .eq('id', verification_id);

    if (incrementError) {
      console.error('Error incrementing verification attempts:', incrementError);
    }

    // Check DNS TXT record for verification
    const txtRecordName = `_wl-verification.${domain}`;
    const expectedValue = `wl-verification=${verification_token}`;
    
    try {
      // Query DNS for TXT records using Cloudflare's DNS API
      const dnsResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${txtRecordName}&type=TXT`,
        {
          headers: {
            'Accept': 'application/dns-json',
          },
        }
      );

      const dnsData = await dnsResponse.json();
      console.log('DNS Response:', JSON.stringify(dnsData, null, 2));

      let isVerified = false;
      if (dnsData.Answer) {
        // Check if any TXT record contains our verification token
        isVerified = dnsData.Answer.some((record: any) => 
          record.type === 16 && // TXT record type
          record.data.includes(expectedValue)
        );
      }

      // Update verification status
      const updateData: any = {
        verification_status: isVerified ? 'verified' : 'failed',
        verified_at: isVerified ? new Date().toISOString() : null,
        last_checked_at: new Date().toISOString(),
        needs_reverification: false,
      };

      const { error: updateError } = await supabase
        .from('domain_verifications')
        .update(updateData)
        .eq('id', verification_id);

      if (updateError) {
        console.error('Error updating domain verification:', updateError);
        throw updateError;
      }

      // If verified, update the white label config
      if (isVerified) {
        const { error: configUpdateError } = await supabase
          .from('white_label_configs')
          .update({
            domain_verification_status: 'verified',
          })
          .eq('custom_domain', domain);

        if (configUpdateError) {
          console.error('Error updating white label config:', configUpdateError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          verified: isVerified,
          message: isVerified 
            ? 'Domain re-verified successfully!' 
            : `Domain re-verification failed. Please ensure the TXT record '${txtRecordName}' contains the value '${expectedValue}'`,
          txtRecord: {
            name: txtRecordName,
            value: expectedValue,
            type: 'TXT'
          },
          lastChecked: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (dnsError) {
      console.error('DNS lookup error:', dnsError);
      
      // Update verification status to failed
      await supabase
        .from('domain_verifications')
        .update({
          verification_status: 'failed',
          last_checked_at: new Date().toISOString(),
        })
        .eq('id', verification_id);

      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          message: 'Failed to re-verify domain. DNS lookup error.',
          error: (dnsError instanceof Error ? dnsError.message : String(dnsError)),
          lastChecked: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Domain re-verification error:', error);
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