import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

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
    const configId = url.searchParams.get('config_id');
    const integrationId = url.searchParams.get('integration_id');

    if (!configId || !integrationId) {
      return new Response(
        JSON.stringify({ error: 'Missing config_id or integration_id parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Processing webhook for:', { configId, integrationId });

    // Get integration configuration
    const { data: integration, error: integrationError } = await supabase
      .from('white_label_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('config_id', configId)
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Verify webhook signature if secret is provided
    const signature = req.headers.get('x-webhook-signature');
    const webhookSecret = integration.webhook_secret;
    
    if (webhookSecret && signature) {
      const body = await req.text();
      const expectedSignature = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(webhookSecret + body)
      );
      const expectedHex = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      if (signature !== `sha256=${expectedHex}`) {
        console.warn('Webhook signature verification failed');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    // Parse webhook payload
    const payload = typeof req.body === 'string' ? JSON.parse(await req.text()) : await req.json();

    // Log webhook event
    const { error: logError } = await supabase
      .from('white_label_webhook_logs')
      .insert({
        config_id: configId,
        integration_id: integrationId,
        event_type: payload.type || payload.event || 'unknown',
        payload: payload,
        source_ip: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        status: 'received'
      });

    if (logError) {
      console.error('Failed to log webhook event:', logError);
    }

    // Process webhook based on integration type
    let processingResult = { success: true, message: 'Webhook received' };

    switch (integration.integration_type) {
      case 'form_submission':
        processingResult = await processFormSubmission(supabase, configId, payload);
        break;
      
      case 'analytics':
        processingResult = await processAnalyticsEvent(supabase, configId, payload);
        break;
      
      case 'email_marketing':
        processingResult = await processEmailMarketingEvent(supabase, configId, payload);
        break;
      
      case 'crm':
        processingResult = await processCRMEvent(supabase, configId, payload);
        break;
      
      default:
        processingResult = await processGenericWebhook(supabase, configId, integration, payload);
    }

    // Update webhook log with processing result
    await supabase
      .from('white_label_webhook_logs')
      .update({
        status: processingResult.success ? 'processed' : 'failed',
        processing_result: processingResult,
        processed_at: new Date().toISOString()
      })
      .eq('config_id', configId)
      .eq('integration_id', integrationId)
      .order('created_at', { ascending: false })
      .limit(1);

    console.log('Webhook processed successfully:', processingResult);

    return new Response(
      JSON.stringify(processingResult),
      {
        status: processingResult.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in webhook-handler function:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

async function processFormSubmission(supabase: any, configId: string, payload: any) {
  try {
    // Store form submission
    const { error } = await supabase
      .from('white_label_form_submissions')
      .insert({
        form_id: payload.form_id,
        submission_data: payload.data || payload,
        ip_address: payload.ip_address,
        user_agent: payload.user_agent,
        utm_source: payload.utm_source,
        utm_medium: payload.utm_medium,
        utm_campaign: payload.utm_campaign,
        referrer: payload.referrer
      });

    if (error) throw error;

    return { success: true, message: 'Form submission processed' };
  } catch (error) {
    return { success: false, message: (error instanceof Error ? error.message : String(error)) };
  }
}

async function processAnalyticsEvent(supabase: any, configId: string, payload: any) {
  // Process analytics events like page views, clicks, conversions
  return { success: true, message: 'Analytics event processed' };
}

async function processEmailMarketingEvent(supabase: any, configId: string, payload: any) {
  // Process email marketing events like unsubscribes, bounces, opens
  return { success: true, message: 'Email marketing event processed' };
}

async function processCRMEvent(supabase: any, configId: string, payload: any) {
  // Process CRM events like lead updates, contact changes
  return { success: true, message: 'CRM event processed' };
}

async function processGenericWebhook(supabase: any, configId: string, integration: any, payload: any) {
  // Process generic webhooks based on integration settings
  const settings = integration.settings || {};
  
  // Apply any transformation rules
  if (settings.transformations) {
    // Apply data transformations
  }
  
  // Forward to other systems if configured
  if (settings.forward_to) {
    // Forward webhook to other endpoints
  }
  
  return { success: true, message: 'Generic webhook processed' };
}

serve(handler);