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

    const { domain, subdomain } = await req.json();

    if (!domain && !subdomain) {
      return new Response(
        JSON.stringify({ error: 'Domain or subdomain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const testDomain = domain || `${subdomain}.openkeyhousing.com`;
    console.log(`Testing configuration for: ${testDomain}`);

    const tests = {
      dns_resolution: false,
      http_connectivity: false,
      https_connectivity: false,
      ssl_certificate: false
    };

    try {
      // Test HTTP connectivity
      const httpResponse = await fetch(`http://${testDomain}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000)
      });
      tests.http_connectivity = httpResponse.status < 500;
    } catch (error) {
      console.log('HTTP test failed:', (error instanceof Error ? error.message : String(error)));
    }

    try {
      // Test HTTPS connectivity and SSL
      const httpsResponse = await fetch(`https://${testDomain}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000)
      });
      tests.https_connectivity = httpsResponse.status < 500;
      tests.ssl_certificate = true; // If HTTPS works, SSL is valid
    } catch (error) {
      console.log('HTTPS test failed:', (error instanceof Error ? error.message : String(error)));
    }

    // Test DNS resolution
    try {
      const dnsResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${testDomain}&type=A`,
        {
          headers: {
            'Accept': 'application/dns-json',
          },
        }
      );
      const dnsData = await dnsResponse.json();
      tests.dns_resolution = dnsData.Answer && dnsData.Answer.length > 0;
    } catch (error) {
      console.log('DNS test failed:', (error instanceof Error ? error.message : String(error)));
    }

    const allTestsPassed = Object.values(tests).every(test => test === true);
    const passedCount = Object.values(tests).filter(test => test === true).length;

    return new Response(
      JSON.stringify({
        success: true,
        domain: testDomain,
        tests,
        overall_status: allTestsPassed ? 'passed' : 'partial',
        passed_tests: passedCount,
        total_tests: Object.keys(tests).length,
        message: allTestsPassed 
          ? 'All configuration tests passed successfully!' 
          : `${passedCount} out of ${Object.keys(tests).length} tests passed. Check failed tests for details.`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Configuration test error:', error);
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