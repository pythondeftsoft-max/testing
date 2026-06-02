import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId, linkUrl, linkText, sessionId } = await req.json();

    // Validate required fields
    if (!postId || !linkUrl) {
      return new Response(
        JSON.stringify({ error: 'postId and linkUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for insert
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request metadata
    const userAgent = req.headers.get('user-agent') || null;
    const referrer = req.headers.get('referer') || null;

    // Insert click record
    const { error } = await supabase
      .from('blog_link_clicks')
      .insert({
        post_id: postId,
        link_url: linkUrl,
        link_text: linkText || null,
        session_id: sessionId || null,
        user_agent: userAgent,
        referrer: referrer,
      });

    if (error) {
      console.error('Error tracking link click:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to track click' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in blog-link-tracker:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
