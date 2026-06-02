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

    const { config_id, invalidation_type = 'full' } = await req.json();

    if (!config_id) {
      return new Response(
        JSON.stringify({ error: 'config_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Invalidating cache for config: ${config_id}, type: ${invalidation_type}`);

    // Get the white label config to determine domains that need cache invalidation
    const { data: config, error: configError } = await supabase
      .from('white_label_configs')
      .select('custom_domain, custom_subdomain, company_name')
      .eq('id', config_id)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'Config not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const domainsToInvalidate = [];
    if (config.custom_domain) {
      domainsToInvalidate.push(config.custom_domain);
    }
    if (config.custom_subdomain) {
      domainsToInvalidate.push(`${config.custom_subdomain}.lovable.app`);
    }

    // Log cache invalidation event
    const { error: logError } = await supabase
      .from('white_label_analytics')
      .insert({
        config_id,
        event_type: 'cache_invalidation',
        metadata: {
          invalidation_type,
          domains: domainsToInvalidate,
          timestamp: new Date().toISOString()
        }
      });

    if (logError) {
      console.error('Error logging cache invalidation:', logError);
    }

    // Simulate cache invalidation process
    // In a real implementation, this would trigger CDN cache purging
    const invalidationResults = await Promise.all(
      domainsToInvalidate.map(async (domain) => {
        try {
          // Simulate cache invalidation API call
          console.log(`Invalidating cache for domain: ${domain}`);
          
          // In production, you would call your CDN's cache invalidation API here
          // For example, with Cloudflare:
          // await fetch(`https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache`, {
          //   method: 'POST',
          //   headers: {
          //     'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          //     'Content-Type': 'application/json'
          //   },
          //   body: JSON.stringify({
          //     hosts: [domain]
          //   })
          // });

          return {
            domain,
            status: 'success',
            message: 'Cache invalidated successfully'
          };
        } catch (error) {
          console.error(`Error invalidating cache for ${domain}:`, error);
          return {
            domain,
            status: 'error',
            message: (error instanceof Error ? error.message : String(error))
          };
        }
      })
    );

    // Trigger real-time update for connected clients
    await supabase
      .from('white_label_configs')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', config_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cache invalidation completed',
        config_id,
        invalidation_type,
        domains: domainsToInvalidate,
        results: invalidationResults,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Cache invalidation error:', error);
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