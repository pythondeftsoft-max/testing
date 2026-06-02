import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface APIRequest {
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate API key and get configuration
    const { data: apiKeyData, error: keyError } = await supabase
      .from('white_label_api_keys')
      .select(`
        *,
        white_label_configs (
          id,
          user_id,
          is_active
        )
      `)
      .eq('api_key_hash', await hashAPIKey(apiKey))
      .eq('is_active', true)
      .single();

    if (keyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if API key is expired
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'API key expired' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update last used timestamp
    await supabase
      .from('white_label_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    // Route the request based on path
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const endpoint = pathSegments[pathSegments.length - 1];

    let response;
    
    switch (endpoint) {
      case 'config':
        response = await handleConfigRequest(req, supabase, apiKeyData);
        break;
      case 'analytics':
        response = await handleAnalyticsRequest(req, supabase, apiKeyData);
        break;
      case 'content':
        response = await handleContentRequest(req, supabase, apiKeyData);
        break;
      case 'themes':
        response = await handleThemesRequest(req, supabase, apiKeyData);
        break;
      default:
        response = new Response(
          JSON.stringify({ error: 'Endpoint not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

    return response;
  } catch (error) {
    console.error('Error in api-gateway function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

async function handleConfigRequest(req: Request, supabase: any, apiKeyData: any) {
  const configId = apiKeyData.config_id;
  
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('white_label_configs')
      .select('*')
      .eq('id', configId)
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (req.method === 'PUT') {
    const updateData = await req.json();
    
    const { data, error } = await supabase
      .from('white_label_configs')
      .update(updateData)
      .eq('id', configId)
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to update configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleAnalyticsRequest(req: Request, supabase: any, apiKeyData: any) {
  const configId = apiKeyData.config_id;
  const url = new URL(req.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const eventType = url.searchParams.get('event_type');

  if (req.method === 'GET') {
    let query = supabase
      .from('white_label_analytics')
      .select('*')
      .eq('config_id', configId)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch analytics' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleContentRequest(req: Request, supabase: any, apiKeyData: any) {
  const configId = apiKeyData.config_id;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('white_label_content')
      .select('*')
      .eq('config_id', configId)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (req.method === 'POST') {
    const contentData = await req.json();
    
    const { data, error } = await supabase
      .from('white_label_content')
      .insert({
        config_id: configId,
        ...contentData,
      })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to create content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleThemesRequest(req: Request, supabase: any, apiKeyData: any) {
  const configId = apiKeyData.config_id;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('white_label_themes')
      .select('*')
      .eq('config_id', configId)
      .order('created_at', { ascending: false });

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch themes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function hashAPIKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(handler);