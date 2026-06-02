import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyOwner } from "../_shared/notify-owner.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get today's date range in UTC
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Fetch blog posts published today
    const { data: posts, error } = await supabase
      .from("content")
      .select("title, slug")
      .eq("content_type", "blog_post")
      .eq("status", "published")
      .gte("publish_date", todayStart.toISOString())
      .lt("publish_date", todayEnd.toISOString())
      .order("publish_date", { ascending: true });

    if (error) {
      console.error("[blog-digest-sms] Query error:", error);
      throw error;
    }

    if (!posts || posts.length === 0) {
      console.log("[blog-digest-sms] No posts published today — skipping SMS");
      return new Response(JSON.stringify({ success: true, sent: false, reason: "no_posts_today" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build digest message
    const lines = posts.map((p, i) =>
      `${i + 1}. ${p.title}\n   https://openkeyhousing.com/blog/${p.slug}`
    );

    const body = `Today's Blog Posts (${posts.length} published)\n\n${lines.join("\n\n")}`;

    await notifyOwner({ subject: "Daily Blog Digest", body });

    console.log(`[blog-digest-sms] Sent digest with ${posts.length} posts`);

    return new Response(JSON.stringify({ success: true, sent: true, postCount: posts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[blog-digest-sms] Error:", err);
    return new Response(JSON.stringify({ success: false, error: (err instanceof Error ? err.message : String(err)) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
