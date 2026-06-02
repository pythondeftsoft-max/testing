import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsEvent {
  configId: string;
  eventType: string;
  pagePath?: string;
  userAgent?: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
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

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const event: AnalyticsEvent = await req.json();
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Validate required fields
    if (!event.configId || !event.eventType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: configId, eventType' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Insert analytics event
    const { data, error } = await supabase
      .from('white_label_analytics')
      .insert({
        config_id: event.configId,
        event_type: event.eventType,
        page_path: event.pagePath,
        user_agent: event.userAgent,
        ip_address: clientIP,
        session_id: event.sessionId,
        user_id: event.userId,
        metadata: event.metadata || {},
      });

    if (error) {
      console.error('Error inserting analytics event:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to record analytics event' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // For page views, also update performance metrics
    if (event.eventType === 'page_view') {
      await updatePerformanceMetrics(supabase, event.configId, event.metadata);
    }

    return new Response(
      JSON.stringify({ success: true, eventId: data?.[0]?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analytics-collector function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

async function updatePerformanceMetrics(
  supabase: any, 
  configId: string, 
  metadata?: Record<string, any>
) {
  try {
    const performanceMetrics = [];

    // Record page load time if available
    if (metadata?.loadTime) {
      performanceMetrics.push({
        config_id: configId,
        metric_type: 'page_load_time',
        metric_value: metadata.loadTime,
        metadata: { page: metadata.page },
      });
    }

    // Record bounce rate calculation
    if (metadata?.sessionDuration) {
      const isBounce = metadata.sessionDuration < 30; // Less than 30 seconds
      performanceMetrics.push({
        config_id: configId,
        metric_type: 'bounce_rate',
        metric_value: isBounce ? 1 : 0,
        metadata: { sessionDuration: metadata.sessionDuration },
      });
    }

    // Record conversion events
    if (metadata?.conversion) {
      performanceMetrics.push({
        config_id: configId,
        metric_type: 'conversion',
        metric_value: 1,
        metadata: { conversionType: metadata.conversionType },
      });
    }

    // Batch insert performance metrics
    if (performanceMetrics.length > 0) {
      await supabase
        .from('white_label_performance')
        .insert(performanceMetrics);
    }
  } catch (error) {
    console.error('Error updating performance metrics:', error);
    // Don't throw - this is optional data
  }
}

serve(handler);