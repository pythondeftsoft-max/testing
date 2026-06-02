import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const { domain, verification_token } = await req.json();

    if (!domain || !verification_token) {
      return new Response(
        JSON.stringify({ error: 'Domain and verification token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying domain: ${domain} with token: ${verification_token}`);

    // Check DNS TXT record for verification
    const txtRecordName = `_wl-verification.${domain}`;
    
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
          record.data.includes(verification_token)
        );
      }

      // Create or update domain verification record
      const { data: existingVerification } = await supabase
        .from('domain_verifications')
        .select('*')
        .eq('domain', domain)
        .single();

      if (existingVerification) {
        // Update existing verification
        const { error: updateError } = await supabase
          .from('domain_verifications')
          .update({
            is_verified: isVerified,
            verified_at: isVerified ? new Date().toISOString() : null,
            last_checked_at: new Date().toISOString(),
          })
          .eq('domain', domain);

        if (updateError) {
          console.error('Error updating domain verification:', updateError);
        }
      } else {
        // Create new verification record
        const { error: insertError } = await supabase
          .from('domain_verifications')
          .insert({
            domain,
            verification_token,
            is_verified: isVerified,
            verified_at: isVerified ? new Date().toISOString() : null,
            last_checked_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Error creating domain verification:', insertError);
        }
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
            ? 'Domain verified successfully!' 
            : `Domain verification failed. Please ensure the TXT record '_wl-verification.${domain}' contains the value '${verification_token}'`,
          txtRecord: {
            name: txtRecordName,
            value: verification_token,
            type: 'TXT'
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (dnsError) {
      console.error('DNS lookup error:', dnsError);
      
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          message: 'Failed to verify domain. DNS lookup error.',
          error: (dnsError instanceof Error ? dnsError.message : String(dnsError))
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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