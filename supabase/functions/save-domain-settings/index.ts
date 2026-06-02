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

    const { configId, domain, subdomain, autoRedirect } = await req.json();

    if (!configId) {
      return new Response(
        JSON.stringify({ error: 'Configuration ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Saving domain settings for config: ${configId}`);

    // Verify user owns this config
    const { data: config, error: configError } = await supabase
      .from('white_label_configs')
      .select('*')
      .eq('id', configId)
      .eq('user_id', user.id)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'Configuration not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the white label config
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (domain) {
      updateData.custom_domain = domain;
      updateData.domain_verification_status = 'pending';
    }

    if (subdomain) {
      updateData.subdomain = subdomain;
    }

    if (autoRedirect !== undefined) {
      updateData.auto_redirect = autoRedirect;
    }

    const { error: updateError } = await supabase
      .from('white_label_configs')
      .update(updateData)
      .eq('id', configId);

    if (updateError) {
      console.error('Error updating white label config:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update domain settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If a custom domain was provided, generate verification token and update config
    if (domain) {
      const verificationToken = `wl-verify-${crypto.randomUUID()}`;
      console.log('Generated verification token:', verificationToken);
      
      // Update the config with the verification token
      const { error: tokenUpdateError } = await supabase
        .from('white_label_configs')
        .update({
          domain_verification_token: verificationToken
        })
        .eq('id', configId);

      if (tokenUpdateError) {
        console.error('Error updating verification token:', tokenUpdateError);
        throw new Error('Failed to update verification token');
      }

      // Create/update domain verification record
      const { error: domainError } = await supabase
        .from('domain_verifications')
        .upsert({
          domain,
          white_label_config_id: configId,
          verification_token: verificationToken,
          verification_status: 'pending',
          last_checked_at: new Date().toISOString()
        });

      if (domainError) {
        console.error('Error creating domain verification:', domainError);
        throw new Error('Failed to create domain verification record');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Domain settings saved successfully',
        config: {
          id: configId,
          custom_domain: domain,
          subdomain: subdomain,
          auto_redirect: autoRedirect
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Save domain settings error:', error);
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