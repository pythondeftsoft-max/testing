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

    const {
      config_id,
      event_type,
      page_path,
      domain,
      user_agent,
      referrer,
      ip_address,
      visitor_id,
      session_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      custom_data
    } = await req.json();

    if (!config_id || !event_type) {
      return new Response(
        JSON.stringify({ error: 'config_id and event_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Tracking analytics event: ${event_type} for config: ${config_id}`);

    // Parse user agent for device/browser info
    const deviceInfo = parseUserAgent(user_agent || '');
    
    // Determine visitor location from IP (simplified)
    const locationData = await getLocationFromIP(ip_address);

    // Create analytics record
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('white_label_analytics')
      .insert({
        config_id,
        event_type,
        page_path: page_path || '/',
        domain: domain || 'unknown',
        visitor_id: visitor_id || generateVisitorId(),
        session_id: session_id || generateSessionId(),
        user_agent,
        referrer,
        ip_address,
        device_type: deviceInfo.device_type,
        browser: deviceInfo.browser,
        operating_system: deviceInfo.os,
        country: locationData.country,
        city: locationData.city,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        custom_data: custom_data || {},
        timestamp: new Date().toISOString()
      });

    if (analyticsError) {
      console.error('Error inserting analytics:', analyticsError);
      return new Response(
        JSON.stringify({ error: 'Failed to track analytics', details: analyticsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update daily summary stats
    await updateDailySummary(supabase, config_id, event_type);

    // Track conversion events
    if (event_type === 'form_submission' || event_type === 'contact_form' || event_type === 'conversion') {
      await trackConversion(supabase, config_id, page_path, custom_data);
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id: analyticsData?.[0]?.id,
        message: 'Analytics event tracked successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Analytics tracking error:', error);
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

function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();
  
  // Device type detection
  let device_type = 'desktop';
  if (ua.includes('mobile') || ua.includes('android')) {
    device_type = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device_type = 'tablet';
  }
  
  // Browser detection
  let browser = 'unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'chrome';
  } else if (ua.includes('firefox')) {
    browser = 'firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'safari';
  } else if (ua.includes('edg')) {
    browser = 'edge';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'opera';
  }
  
  // OS detection
  let os = 'unknown';
  if (ua.includes('windows')) {
    os = 'windows';
  } else if (ua.includes('mac')) {
    os = 'macos';
  } else if (ua.includes('linux')) {
    os = 'linux';
  } else if (ua.includes('android')) {
    os = 'android';
  } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
    os = 'ios';
  }
  
  return { device_type, browser, os };
}

async function getLocationFromIP(ip: string) {
  // Simplified location detection - in production, use a proper GeoIP service
  try {
    if (!ip || ip === '127.0.0.1' || ip === 'localhost') {
      return { country: 'Unknown', city: 'Unknown' };
    }
    
    // You could integrate with services like ipapi.co, ipgeolocation.io, etc.
    // For now, return default values
    return { country: 'US', city: 'Unknown' };
  } catch (error) {
    console.error('Location detection error:', error);
    return { country: 'Unknown', city: 'Unknown' };
  }
}

function generateVisitorId() {
  return 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function updateDailySummary(supabase: any, configId: string, eventType: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if daily summary exists
    const { data: existingSummary } = await supabase
      .from('white_label_daily_analytics')
      .select('*')
      .eq('config_id', configId)
      .eq('date', today)
      .single();
    
    if (existingSummary) {
      // Update existing summary
      const updates: any = {};
      
      switch (eventType) {
        case 'page_view':
          updates.page_views = (existingSummary.page_views || 0) + 1;
          break;
        case 'unique_visitor':
          updates.unique_visitors = (existingSummary.unique_visitors || 0) + 1;
          break;
        case 'form_submission':
        case 'contact_form':
        case 'conversion':
          updates.conversions = (existingSummary.conversions || 0) + 1;
          break;
        case 'bounce':
          updates.bounce_rate = Math.min(100, (existingSummary.bounce_rate || 0) + 1);
          break;
      }
      
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('white_label_daily_analytics')
          .update(updates)
          .eq('config_id', configId)
          .eq('date', today);
      }
    } else {
      // Create new summary
      const initialData: any = {
        config_id: configId,
        date: today,
        page_views: 0,
        unique_visitors: 0,
        conversions: 0,
        bounce_rate: 0,
        avg_session_duration: 0
      };
      
      switch (eventType) {
        case 'page_view':
          initialData.page_views = 1;
          break;
        case 'unique_visitor':
          initialData.unique_visitors = 1;
          break;
        case 'form_submission':
        case 'contact_form':
        case 'conversion':
          initialData.conversions = 1;
          break;
      }
      
      await supabase
        .from('white_label_daily_analytics')
        .insert(initialData);
    }
  } catch (error) {
    console.error('Error updating daily summary:', error);
  }
}

async function trackConversion(supabase: any, configId: string, pagePath: string, customData: any) {
  try {
    await supabase
      .from('white_label_conversions')
      .insert({
        config_id: configId,
        conversion_type: customData?.conversion_type || 'form_submission',
        page_path: pagePath,
        value: customData?.value || 0,
        currency: customData?.currency || 'USD',
        conversion_data: customData || {},
        timestamp: new Date().toISOString()
      });
    
    console.log(`Conversion tracked for config ${configId}`);
  } catch (error) {
    console.error('Error tracking conversion:', error);
  }
}