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

    const { domain, verification_id } = await req.json();

    if (!domain || !verification_id) {
      return new Response(
        JSON.stringify({ error: 'Domain and verification ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Resetting domain verification for: ${domain}, ID: ${verification_id}`);

    // Generate new verification token
    const newVerificationToken = `wl-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // Get user ID from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset the domain verification
    const { error: updateError } = await supabase
      .from('domain_verifications')
      .update({
        verification_token: newVerificationToken,
        verification_status: 'pending',
        verified_at: null,
        needs_reverification: false,
        verification_attempts: 0,
        reset_by: userData.user.id,
        reset_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      })
      .eq('id', verification_id)
      .eq('domain', domain);

    if (updateError) {
      console.error('Error resetting domain verification:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to reset domain verification', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update white label config status
    const { error: configUpdateError } = await supabase
      .from('white_label_configs')
      .update({
        domain_verification_status: 'pending',
      })
      .eq('custom_domain', domain);

    if (configUpdateError) {
      console.error('Error updating white label config:', configUpdateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Domain verification reset successfully',
        verification_token: newVerificationToken,
        txtRecord: {
          name: `_wl-verification.${domain}`,
          value: `wl-verification=${newVerificationToken}`,
          type: 'TXT'
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Reset domain verification error:', error);
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