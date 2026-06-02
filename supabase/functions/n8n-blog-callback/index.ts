import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BlogPostPayload {
  log_id: string;
  n8n_execution_id?: string;
  language: string;
  parent_post_id?: string; // For translations, link to English original
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  content_structure: {
    sections: Array<{
      type: 'intro' | 'h2' | 'h3';
      title?: string;
      content: string;
    }>;
    faqs: Array<{
      question: string;
      answer: string;
    }>;
    conclusion: string;
  };
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  pillar_id: string;
  featured_image_url?: string;
  json_ld?: object | object[];  // JSON-LD structured data (Schema.org)
  research_sources?: Array<{ url: string; title: string }>;
  knowledge_facts_used?: string[];
  tokens_used?: number;
  model_used?: string;
}

interface ErrorPayload {
  log_id: string;
  n8n_execution_id?: string;
  error_message: string;
  status: 'failed' | 'rate_limited';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    
    // Check if this is an error callback
    if (body.error_message) {
      const errorPayload = body as ErrorPayload;
      
      await supabase
        .from('blog_generation_logs')
        .update({
          status: errorPayload.status || 'failed',
          error_message: errorPayload.error_message,
          n8n_execution_id: errorPayload.n8n_execution_id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', errorPayload.log_id);

      console.log(`Updated log ${errorPayload.log_id} with error: ${errorPayload.error_message}`);
      
      return new Response(
        JSON.stringify({ success: true, type: 'error_logged' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process successful blog post
    const postPayload = body as BlogPostPayload;
    
    // Validate required fields
    if (!postPayload.log_id || !postPayload.title || !postPayload.slug || !postPayload.pillar_id) {
      throw new Error('Missing required fields: log_id, title, slug, pillar_id');
    }

    // Generate unique slug for non-English posts
    let finalSlug = postPayload.slug;
    if (postPayload.language !== 'en') {
      finalSlug = `${postPayload.slug}-${postPayload.language}`;
    }

    // Insert the blog post
    const { data: newPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        title: postPayload.title,
        slug: finalSlug,
        excerpt: postPayload.excerpt,
        content: postPayload.content,
        content_structure: postPayload.content_structure,
        seo_title: postPayload.seo_title,
        seo_description: postPayload.seo_description,
        seo_keywords: postPayload.seo_keywords,
        pillar_id: postPayload.pillar_id,
        featured_image_url: postPayload.featured_image_url,
        meta_tags: postPayload.json_ld ? { json_ld: postPayload.json_ld } : null,
        language: postPayload.language,
        parent_post_id: postPayload.parent_post_id || null,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert blog post:', insertError);
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    console.log(`Created blog post: ${newPost.title} (${postPayload.language})`);

    // Update generation log
    const logUpdate: Record<string, any> = {
      n8n_execution_id: postPayload.n8n_execution_id,
    };

    // For English (primary) posts, update full log
    if (postPayload.language === 'en') {
      logUpdate.status = 'success';
      logUpdate.generated_post_id = newPost.id;
      logUpdate.research_sources = postPayload.research_sources || [];
      logUpdate.knowledge_facts_used = postPayload.knowledge_facts_used || [];
      logUpdate.tokens_used = postPayload.tokens_used;
      logUpdate.model_used = postPayload.model_used;
      logUpdate.completed_at = new Date().toISOString();
    }

    // Append language to languages_generated array
    const { data: currentLog } = await supabase
      .from('blog_generation_logs')
      .select('languages_generated')
      .eq('id', postPayload.log_id)
      .single();

    const currentLanguages = currentLog?.languages_generated || [];
    if (!currentLanguages.includes(postPayload.language)) {
      logUpdate.languages_generated = [...currentLanguages, postPayload.language];
    }

    await supabase
      .from('blog_generation_logs')
      .update(logUpdate)
      .eq('id', postPayload.log_id);

    // Update pillar last_published_at for English posts only
    if (postPayload.language === 'en') {
      await supabase
        .from('blog_pillars')
        .update({ 
          last_published_at: new Date().toISOString(),
        })
        .eq('id', postPayload.pillar_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        post_id: newPost.id,
        slug: newPost.slug,
        language: postPayload.language,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Callback error:', error);
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
