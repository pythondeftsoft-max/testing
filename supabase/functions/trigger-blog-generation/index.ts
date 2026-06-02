import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TriggerRequest {
  pillar_id?: string;
  topic_override?: string;
  location_state?: string;
  location_city?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const n8nWebhookUrl = Deno.env.get('N8N_BLOG_WEBHOOK_URL');

    if (!n8nWebhookUrl) {
      throw new Error('N8N_BLOG_WEBHOOK_URL secret is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body: TriggerRequest = await req.json();
    const { pillar_id, topic_override, location_state, location_city } = body;

    // Get next pillar in rotation if not specified
    let targetPillarId = pillar_id;
    if (!targetPillarId) {
      const { data: nextPillar } = await supabase
        .from('blog_pillars')
        .select('id')
        .eq('active', true)
        .order('last_published_at', { ascending: true, nullsFirst: true })
        .order('rotation_order', { ascending: true })
        .limit(1)
        .single();
      
      targetPillarId = nextPillar?.id;
    }

    if (!targetPillarId) {
      throw new Error('No active pillars available for generation');
    }

    // Create generation log entry
    const { data: logEntry, error: logError } = await supabase
      .from('blog_generation_logs')
      .insert({
        pillar_id: targetPillarId,
        topic_seed: topic_override || null,
        location_state,
        location_city,
        status: 'pending',
        triggered_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create log entry:', logError);
      throw new Error('Failed to create generation log');
    }

    // Get pillar details for n8n
    const { data: pillar } = await supabase
      .from('blog_pillars')
      .select('*')
      .eq('id', targetPillarId)
      .single();

    // Get knowledge base facts for this pillar
    const { data: knowledgeFacts } = await supabase
      .from('content_knowledge_base')
      .select('fact_text, source_url, category')
      .eq('is_verified', true)
      .limit(20);

    // Get recent topics to avoid duplication
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentTopics } = await supabase
      .from('blog_generation_logs')
      .select('topic_seed')
      .eq('pillar_id', targetPillarId)
      .eq('status', 'success')
      .gte('triggered_at', thirtyDaysAgo.toISOString());

    // Get supported languages
    const { data: languages } = await supabase
      .from('supported_languages')
      .select('code, name, native_name')
      .eq('is_active', true)
      .order('display_order');

    // Fire webhook to n8n (fire-and-forget pattern)
    const webhookPayload = {
      log_id: logEntry.id,
      pillar: pillar,
      topic_override,
      location_state,
      location_city,
      knowledge_facts: knowledgeFacts || [],
      recent_topics: recentTopics?.map(t => t.topic_seed).filter(Boolean) || [],
      languages: languages || [{ code: 'en', name: 'English', native_name: 'English' }],
      callback_url: `${supabaseUrl}/functions/v1/n8n-blog-callback`,
      supabase_url: supabaseUrl,
    };

    // Don't await - fire and forget
    fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    }).catch(err => {
      console.error('n8n webhook call failed:', err);
    });

    console.log(`Triggered n8n workflow for pillar ${pillar?.name}, log ID: ${logEntry.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        log_id: logEntry.id,
        message: 'Blog generation triggered. Check logs for progress.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Trigger error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
