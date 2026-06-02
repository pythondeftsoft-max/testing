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

    console.log(`Checking DNS status for domain: ${domain}`);

    // Check DNS TXT record using Cloudflare DNS
    const dnsUrl = `https://cloudflare-dns.com/dns-query?name=_wl-verification.${domain}&type=TXT`;
    
    let recordFound = false;
    let actualValue = null;
    let dnsError = null;
    let recordDetails = [];

    try {
      const dnsResponse = await fetch(dnsUrl, {
        headers: {
          'Accept': 'application/dns-json',
        },
      });

      const dnsData = await dnsResponse.json();
      
      if (dnsData.Answer && dnsData.Answer.length > 0) {
        for (const record of dnsData.Answer) {
          if (record.data) {
            recordDetails.push(record.data);
            if (record.data.includes(`wl-verification=${verification_token}`)) {
              recordFound = true;
              actualValue = record.data;
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('DNS lookup error:', error);
      dnsError = 'Failed to perform DNS lookup. Please try again.';
    }

    const expectedValue = `wl-verification=${verification_token}`;
    
    let message = '';
    let suggestions = [];
    
    if (dnsError) {
      message = dnsError;
      suggestions = [
        'Check your internet connection',
        'Try again in a few moments',
        'Verify the domain name is correct'
      ];
    } else if (recordFound) {
      message = 'DNS TXT record found and matches the expected value!';
      suggestions = ['Your DNS is configured correctly. You can now verify your domain.'];
    } else if (recordDetails.length > 0) {
      message = 'DNS TXT record found but does not match the expected value.';
      suggestions = [
        'Check that you copied the verification token correctly',
        'Ensure you have the full TXT record value including "wl-verification="',
        'Delete any old verification records for this subdomain'
      ];
    } else {
      message = 'No DNS TXT record found for _wl-verification subdomain.';
      suggestions = [
        'Add the TXT record to your DNS settings',
        'Wait for DNS propagation (can take up to 24 hours)',
        'Check with your DNS provider for specific instructions'
      ];
    }

    return new Response(
      JSON.stringify({
        success: true,
        recordFound,
        message,
        suggestions,
        details: {
          lookupUrl: `_wl-verification.${domain}`,
          expectedValue,
          actualValue,
          foundRecords: recordDetails,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('DNS check error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        message: 'Failed to check DNS status. Please try again.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});