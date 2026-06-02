import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  source?: string;
  pillar_id?: string;
  topic_override?: string;
  location_state?: string;
  location_city?: string;
}

interface BlogSection {
  type: "intro" | "h2" | "h3";
  title?: string;
  content: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface GeneratedPost {
  title: string;
  slug: string;
  excerpt: string;
  primary_keyword: string;
  semantic_keywords: string[];
  sections: BlogSection[];
  faqs: FAQ[];
  conclusion: string;
  sources_cited: { title: string; url: string }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey);

  let logId: string | null = null;

  try {
    const { source, pillar_id, topic_override, location_state, location_city }: GenerateRequest = await req.json();

    console.log(`Generate request: source=${source}, pillar_id=${pillar_id}, topic=${topic_override}`);

    // Check if automation is enabled when triggered by cron
    if (source === "scheduled") {
      const { data: automationConfig } = await supabase
        .from("system_config")
        .select("config_value")
        .eq("config_key", "seo_automation_enabled")
        .single();
      
      const isEnabled = automationConfig?.config_value === true || automationConfig?.config_value === "true";
      
      if (!isEnabled) {
        console.log("SEO automation is disabled, skipping scheduled generation");
        return new Response(
          JSON.stringify({ success: false, skipped: true, reason: "Automation disabled" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check minimum hours between posts
      const { data: minHoursConfig } = await supabase
        .from("system_config")
        .select("config_value")
        .eq("config_key", "seo_min_hours_between_posts")
        .single();
      
      const minHours = parseInt(String(minHoursConfig?.config_value || "6"));

      const { data: lastLog } = await supabase
        .from("blog_generation_logs")
        .select("completed_at")
        .eq("status", "success")
        .order("completed_at", { ascending: false })
        .limit(1)
        .single();

      if (lastLog?.completed_at) {
        const hoursSince = (Date.now() - new Date(lastLog.completed_at).getTime()) / (1000 * 60 * 60);
        if (hoursSince < minHours) {
          console.log(`Too soon - ${hoursSince.toFixed(1)}h since last post, need ${minHours}h`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              skipped: true, 
              reason: `Too soon - wait ${Math.ceil(minHours - hoursSince)} more hours` 
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Step 1: Determine which pillar to generate for
    let targetPillar;
    
    if (pillar_id) {
      const { data: pillar, error } = await supabase
        .from("blog_pillars")
        .select("*")
        .eq("id", pillar_id)
        .eq("active", true)
        .single();
      
      if (error || !pillar) {
        throw new Error("Specified pillar not found");
      }
      targetPillar = pillar;
    } else {
      // Get next pillar in rotation (oldest last_published_at)
      const { data: pillars, error } = await supabase
        .from("blog_pillars")
        .select("*")
        .eq("active", true)
        .order("last_published_at", { ascending: true, nullsFirst: true })
        .limit(1);

      if (error || !pillars?.length) {
        throw new Error("No active pillars found");
      }
      targetPillar = pillars[0];
    }

    console.log(`Selected pillar: ${targetPillar.name} (${targetPillar.slug})`);

    // Step 2: Select topic from pillar's content_focus with deduplication
    const contentFocus = targetPillar.content_focus || [];
    
    // Get topics used in last 30 days for this pillar to avoid duplicates
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentPosts } = await supabase
      .from("blog_posts")
      .select("primary_keyword, generation_metadata")
      .eq("pillar_id", targetPillar.id)
      .eq("ai_generated", true)
      .gte("created_at", thirtyDaysAgo)
      .limit(50);

    const usedTopics = new Set(
      (recentPosts || [])
        .map(p => {
          const metadata = p.generation_metadata as { topic_seed?: string } | null;
          return metadata?.topic_seed?.toLowerCase();
        })
        .filter(Boolean)
    );

    console.log(`Found ${usedTopics.size} recently used topics for ${targetPillar.slug}`);

    // Filter out recently used topics
    const availableTopics = contentFocus.filter(
      (topic: string) => !usedTopics.has(topic.replace(/-/g, " ").toLowerCase())
    );

    console.log(`Available topics: ${availableTopics.length} of ${contentFocus.length}`);

    // Pick from available topics, or fall back to all if all used
    const topicPool = availableTopics.length > 0 ? availableTopics : contentFocus;
    const topicSeed = topic_override || topicPool[Math.floor(Math.random() * topicPool.length)] || "general-guide";
    
    // Convert slug to readable topic
    const readableTopic = topicSeed.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

    console.log(`Topic seed: ${readableTopic} (${topic_override ? "override" : "auto-selected"})`);

    // Step 3: Create generation log entry
    const { data: logEntry, error: logError } = await supabase
      .from("blog_generation_logs")
      .insert({
        pillar_id: targetPillar.id,
        topic_seed: readableTopic,
        location_state,
        location_city,
        status: "researching",
      })
      .select()
      .single();

    if (logError) {
      console.error("Failed to create log entry:", logError);
    } else {
      logId = logEntry.id;
    }

    // Step 4: Call research function
    const researchUrl = `${supabaseUrl}/functions/v1/research-blog-topic`;
    const researchResponse = await fetch(researchUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pillar_slug: targetPillar.slug,
        topic_seed: readableTopic,
        location_state,
        location_city,
      }),
    });

    let researchContext = null;
    if (researchResponse.ok) {
      researchContext = await researchResponse.json();
      console.log("Research completed successfully");
    } else {
      console.error("Research failed, proceeding without web context");
    }

    // Update log status
    if (logId) {
      await supabase
        .from("blog_generation_logs")
        .update({
          status: "generating",
          research_sources: researchContext?.web_search_results || [],
          knowledge_facts_used: researchContext?.knowledge_base_facts || [],
        })
        .eq("id", logId);
    }

    // Step 5: Build the AI prompt
    const knowledgeFacts = researchContext?.knowledge_base_facts || [];
    const webResults = researchContext?.web_search_results || [];

    let contextSection = "";
    
    if (knowledgeFacts.length > 0) {
      contextSection += "\n\nVERIFIED FACTS FROM KNOWLEDGE BASE:\n";
      for (const fact of knowledgeFacts.slice(0, 5)) {
        contextSection += `- ${fact.fact_title}: ${fact.fact_content}\n`;
      }
    }

    if (webResults.length > 0) {
      contextSection += "\n\nCURRENT WEB RESEARCH:\n";
      for (const result of webResults.slice(0, 3)) {
        contextSection += `- ${result.title}: ${result.description || result.markdown?.substring(0, 300) || ""}\n  Source: ${result.url}\n`;
      }
    }

    const locationContext = location_city && location_state 
      ? ` in ${location_city}, ${location_state}`
      : location_state 
        ? ` in ${location_state}`
        : "";

    const pillarSpecificGuidance = getPillarGuidance(targetPillar.slug, targetPillar.cta_type);

    const OPENKEY_BRAND_CONTEXT = `
BRAND CONTEXT - OPENKEY:
OpenKey is an affordable housing platform that directly connects landlords with qualified tenants, including Section 8 voucher holders.

KEY DIFFERENTIATORS:
- Direct tenant-landlord matching (no public marketplace browsing)
- Streamlined application intake for housing assistance programs
- Free for tenants, simple onboarding for landlords
- Focus on affordable housing and Section 8/HCV programs
- Admin-facilitated matching process for quality connections

WEBSITE: openkey-housing-hub.lovable.app

CONTENT RULES:
- When discussing housing solutions, position OpenKey as an option worth exploring
- When discussing finding tenants or landlords, mention OpenKey's direct-matching approach
- For generic real estate news, OpenKey mention is optional
- Never hard-sell - use soft CTAs like "Learn more at OpenKey" or "Platforms like OpenKey..."
- Do NOT promote competitor platforms like Stessa, Buildium, AppFolio, etc.
`;

    const systemPrompt = `You are an expert affordable housing content writer for OpenKey, creating authoritative reference content for an SEO blog. Your content must be neutral, factual, and designed to rank in Google Search, Google AI Overviews, ChatGPT, and Perplexity.

${OPENKEY_BRAND_CONTEXT}

WRITING RULES (STRICT - FOLLOW EXACTLY):
1. Neutral, informational tone - but naturally reference OpenKey where relevant
2. Clear definition-style introduction (2-3 paragraphs max) that directly answers what the topic is
3. Use only H2 and H3 headings - create a scannable structure
4. Answer likely questions directly and factually
5. Include 4-5 FAQs with concise, helpful answers (one can optionally mention OpenKey if natural)
6. Write a conclusion with a soft CTA mentioning OpenKey where appropriate
7. If uncertain about a fact, state it as "typically" or "generally" rather than asserting
8. Target readability for AI citations - use clear, factual language that AI systems can quote
9. When comparing housing solutions, position OpenKey's direct-matching approach as an option

${pillarSpecificGuidance}

CONTENT PILLAR: ${targetPillar.name}
TOPIC: ${readableTopic}${locationContext}
PILLAR DESCRIPTION: ${targetPillar.description || ""}
${contextSection}

OUTPUT: Use the create_blog_post tool to structure your response.`;

    const userPrompt = `Write a comprehensive, authoritative blog post about "${readableTopic}"${locationContext} for the ${targetPillar.name} pillar.

The post should:
- Be 1000-1500 words
- Target the primary keyword based on the topic
- Include related semantic keywords
- Have 4-6 H2/H3 sections with clear, informative content
- Include 4-5 FAQs that real users would ask
- Cite sources where applicable

Remember: This is reference content, not marketing. Write like a trusted housing expert.`;

    // Step 6: Call Lovable AI with tool calling
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_blog_post",
              description: "Create a structured SEO blog post with all required sections",
              parameters: {
                type: "object",
                properties: {
                  title: { 
                    type: "string", 
                    description: "Clear, factual title with primary keyword (50-60 chars)" 
                  },
                  slug: { 
                    type: "string", 
                    description: "URL-friendly slug (lowercase, hyphens, no special chars)" 
                  },
                  excerpt: { 
                    type: "string", 
                    description: "150-160 character meta description summary" 
                  },
                  primary_keyword: { 
                    type: "string", 
                    description: "Main SEO keyword to target" 
                  },
                  semantic_keywords: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "5-10 related keywords" 
                  },
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["intro", "h2", "h3"] },
                        title: { type: "string" },
                        content: { type: "string" },
                      },
                      required: ["type", "content"],
                    },
                    description: "Content sections - intro first, then H2/H3 sections",
                  },
                  faqs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        answer: { type: "string" },
                      },
                      required: ["question", "answer"],
                    },
                    minItems: 3,
                    maxItems: 7,
                    description: "Frequently asked questions with concise answers",
                  },
                  conclusion: { 
                    type: "string", 
                    description: "Neutral closing paragraph (no sales pitch)" 
                  },
                  sources_cited: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        url: { type: "string" },
                      },
                      required: ["title", "url"],
                    },
                    description: "Sources referenced in the content",
                  },
                },
                required: ["title", "slug", "excerpt", "primary_keyword", "semantic_keywords", "sections", "faqs", "conclusion"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_blog_post" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      
      if (aiResponse.status === 429) {
        if (logId) {
          await supabase.from("blog_generation_logs").update({ 
            status: "rate_limited", 
            error_message: "Rate limit exceeded" 
          }).eq("id", logId);
        }
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI generation failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No valid tool call response from AI");
    }

    const generatedPost: GeneratedPost = JSON.parse(toolCall.function.arguments);
    console.log(`Generated post: ${generatedPost.title}`);

    // Validate AI returned proper content with substantial sections
    const validSections = generatedPost.sections?.filter(
      (s) => s.content && s.content.length > 50
    );
    if (!validSections || validSections.length < 3) {
      const errorMsg = `AI returned insufficient content - only ${validSections?.length || 0} valid sections (need at least 3)`;
      console.error(errorMsg);
      if (logId) {
        await supabase.from("blog_generation_logs").update({ 
          status: "failed", 
          error_message: errorMsg 
        }).eq("id", logId);
      }
      throw new Error(errorMsg);
    }
    console.log(`Validated ${validSections.length} sections with content`);

    // Step 7: Build content from sections
    let fullContent = "";
    const contentStructure: BlogSection[] = [];

    for (const section of generatedPost.sections) {
      if (section.type === "intro") {
        fullContent += `${section.content}\n\n`;
      } else if (section.type === "h2") {
        fullContent += `## ${section.title}\n\n${section.content}\n\n`;
      } else if (section.type === "h3") {
        fullContent += `### ${section.title}\n\n${section.content}\n\n`;
      }
      contentStructure.push(section);
    }

    // Add FAQ section
    if (generatedPost.faqs?.length) {
      fullContent += `## Frequently Asked Questions\n\n`;
      for (const faq of generatedPost.faqs) {
        fullContent += `### ${faq.question}\n\n${faq.answer}\n\n`;
      }
    }

    // Add conclusion
    if (generatedPost.conclusion) {
      fullContent += `## Conclusion\n\n${generatedPost.conclusion}\n`;
    }

    // Step 8: Insert the blog post
    const { data: newPost, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        title: generatedPost.title,
        slug: `${targetPillar.slug}-${generatedPost.slug}-${Date.now()}`,
        content: fullContent,
        excerpt: generatedPost.excerpt,
        status: "published",
        pillar_id: targetPillar.id,
        content_structure: {
          sections: contentStructure,
          faqs: generatedPost.faqs,
          conclusion: generatedPost.conclusion,
        },
        primary_keyword: generatedPost.primary_keyword,
        semantic_keywords: generatedPost.semantic_keywords,
        location_state,
        location_city,
        ai_generated: true,
        sources_cited: generatedPost.sources_cited || [],
        generation_metadata: {
          model: "google/gemini-3-flash-preview",
          generated_at: new Date().toISOString(),
          topic_seed: readableTopic,
          research_used: researchContext ? true : false,
        },
        published_at: new Date().toISOString(),
        seo_title: generatedPost.title,
        seo_description: generatedPost.excerpt,
        seo_keywords: generatedPost.semantic_keywords,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert post:", insertError);
      throw new Error(`Failed to save post: ${insertError.message}`);
    }

    console.log(`Post saved with ID: ${newPost.id}`);

    // Step 9: Update pillar stats
    await supabase
      .from("blog_pillars")
      .update({
        last_published_at: new Date().toISOString(),
        posts_count: targetPillar.posts_count + 1,
      })
      .eq("id", targetPillar.id);

    // Step 10: Update generation log
    if (logId) {
      await supabase
        .from("blog_generation_logs")
        .update({
          status: "success",
          completed_at: new Date().toISOString(),
          generated_post_id: newPost.id,
          model_used: "google/gemini-3-flash-preview",
          tokens_used: aiData.usage?.total_tokens || null,
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        post: {
          id: newPost.id,
          title: newPost.title,
          slug: newPost.slug,
          pillar: targetPillar.name,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generation error:", error);
    
    // Update log on failure
    if (logId) {
      await supabase
        .from("blog_generation_logs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : "Unknown error",
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getPillarGuidance(pillarSlug: string, ctaType: string): string {
  const guidance: Record<string, string> = {
    tenants: `
PILLAR-SPECIFIC GUIDANCE (Tenants/Section 8):
- Focus on eligibility requirements, application processes, and timelines
- Explain HUD programs clearly and factually
- Include waiting list information and tips
- Mention fair housing rights
- If location-specific, reference local housing authority procedures
- Position OpenKey as a free resource for finding housing-accepting landlords
- Soft CTA: "OpenKey helps connect Section 8 tenants with accepting landlords"
- CTA Style: Soft signup suggestion - guide users to OpenKey for housing help`,
    
    landlords: `
PILLAR-SPECIFIC GUIDANCE (Landlords):
PRIMARY FOCUS: Finding quality tenants, property management best practices, and maximizing rental income
- Focus on tenant screening, lease management, and rent collection strategies
- Discuss Section 8/HCV program benefits for landlords (guaranteed rent, stable tenants)
- Cover property maintenance, legal compliance, and landlord-tenant law
- Write about all property types: single-family, multifamily, affordable housing
- When discussing finding tenants, mention OpenKey's direct-matching platform
- Position OpenKey as a free tool for landlords to connect with qualified tenants
- Soft CTA: "List your property on OpenKey to connect with qualified tenants"
- Do NOT promote competitor PM software - focus on actionable advice
- CTA Style: Informational with soft OpenKey mention`,
    
    "property-managers": `
PILLAR-SPECIFIC GUIDANCE (Property Managers):
PRIMARY FOCUS: Portfolio management, affordable housing compliance, and tenant acquisition
- Cover portfolio analytics, owner reporting, and scaling strategies
- Discuss affordable housing compliance (LIHTC, Section 8, fair housing)
- Write about filling vacancies and reducing turnover
- Cover all asset classes: multifamily, affordable housing, senior living
- When discussing tenant sourcing for affordable units, mention OpenKey
- Position OpenKey as a sourcing tool for Section 8 and affordable housing tenants
- Soft CTA: "OpenKey helps property managers fill affordable units faster"
- Do NOT promote competitor PM platforms by name
- CTA Style: Informational with soft OpenKey mention`,
    
    "real-estate": `
PILLAR-SPECIFIC GUIDANCE (Real Estate/Market):
- Focus on data, trends, and policy analysis
- Use current statistics and market indicators
- Cover legislative changes and their impact
- Maintain analytical, objective tone
- This content is for backlinks and AI citations
- OpenKey mention optional - only if naturally relevant to affordable housing trends
- CTA Style: Newsletter signup only or none`,
  };

  return guidance[pillarSlug] || "";
}
