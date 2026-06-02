import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerificationRequest {
  config_id: string;
  subdomain: string;
}

interface VerificationResult {
  subdomain: string;
  status: string;
  ssl_status: string;
  dns_status: string;
  http_status_code?: number;
  response_time_ms?: number;
  verification_errors: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { config_id, subdomain }: VerificationRequest = await req.json();

    if (!config_id || !subdomain) {
      return new Response(
        JSON.stringify({ error: 'config_id and subdomain are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting verification for subdomain: ${subdomain}`);

    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this config
    const { data: config, error: configError } = await supabase
      .from('white_label_configs')
      .select('id')
      .eq('id', config_id)
      .eq('user_id', user.id)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'Configuration not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Perform verification
    const verification = await verifySubdomain(subdomain);

    // Update or insert verification record
    const { error: upsertError } = await supabase
      .from('subdomain_verifications')
      .upsert({
        config_id,
        subdomain,
        verification_status: verification.status,
        ssl_status: verification.ssl_status,
        dns_status: verification.dns_status,
        http_status_code: verification.http_status_code,
        response_time_ms: verification.response_time_ms,
        verification_errors: verification.verification_errors,
        last_checked_at: new Date().toISOString(),
        last_verified_at: verification.status === 'verified' ? new Date().toISOString() : null,
        verification_attempts: 1
      }, {
        onConflict: 'config_id,subdomain'
      });

    if (upsertError) {
      console.error('Error updating verification record:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to update verification record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, verification }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function verifySubdomain(subdomain: string): Promise<VerificationResult> {
  const errors: string[] = [];
  let httpStatusCode: number | undefined;
  let responseTimeMs: number | undefined;
  let sslStatus = 'unknown';
  let dnsStatus = 'unknown';
  let overallStatus = 'failed';

  // Determine base domain - check if subdomain already includes base domain
  const baseDomain = subdomain.includes('.') ? '' : '.openkeyhousing.com';
  const fullDomain = subdomain + baseDomain;

  try {
    // Test HTTP accessibility
    const startTime = Date.now();
    
    try {
      const httpResponse = await fetch(`http://${fullDomain}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      httpStatusCode = httpResponse.status;
      responseTimeMs = Date.now() - startTime;
      
      if (httpStatusCode >= 200 && httpStatusCode < 400) {
        dnsStatus = 'resolved';
      } else {
        errors.push(`HTTP request failed with status: ${httpStatusCode}`);
      }
    } catch (httpError) {
      errors.push(`HTTP accessibility failed: ${(httpError instanceof Error ? httpError.message : String(httpError))}`);
    }

    // Test HTTPS/SSL
    try {
      const httpsResponse = await fetch(`https://${fullDomain}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000)
      });
      
      if (httpsResponse.status >= 200 && httpsResponse.status < 400) {
        sslStatus = 'valid';
        dnsStatus = 'resolved';
        overallStatus = 'verified';
      } else {
        sslStatus = 'invalid';
        errors.push(`HTTPS request failed with status: ${httpsResponse.status}`);
      }
    } catch (httpsError) {
      sslStatus = 'invalid';
      errors.push(`SSL verification failed: ${(httpsError instanceof Error ? httpsError.message : String(httpsError))}`);
    }

    // DNS resolution test using a public DNS API
    try {
      const dnsResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${fullDomain}&type=A`,
        {
          headers: { 'Accept': 'application/dns-json' },
          signal: AbortSignal.timeout(5000)
        }
      );
      
      if (dnsResponse.ok) {
        const dnsData = await dnsResponse.json();
        if (dnsData.Answer && dnsData.Answer.length > 0) {
          dnsStatus = 'resolved';
        } else {
          dnsStatus = 'no_records';
          errors.push('No DNS A records found');
        }
      } else {
        dnsStatus = 'error';
        errors.push('DNS query failed');
      }
    } catch (dnsError) {
      dnsStatus = 'error';
      errors.push(`DNS resolution failed: ${(dnsError instanceof Error ? dnsError.message : String(dnsError))}`);
    }

  } catch (error) {
    errors.push(`General verification error: ${(error instanceof Error ? error.message : String(error))}`);
  }

  // Determine final status
  if (sslStatus === 'valid' && dnsStatus === 'resolved' && (!httpStatusCode || httpStatusCode < 400)) {
    overallStatus = 'verified';
  } else if (dnsStatus === 'resolved') {
    overallStatus = 'pending';
  } else {
    overallStatus = 'failed';
  }

  return {
    subdomain: fullDomain,
    status: overallStatus,
    ssl_status: sslStatus,
    dns_status: dnsStatus,
    http_status_code: httpStatusCode,
    response_time_ms: responseTimeMs,
    verification_errors: errors
  };
}