import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResearchRequest {
  pillar_slug: string;
  topic_seed: string;
  location_state?: string;
  location_city?: string;
}

interface KnowledgeFact {
  id: string;
  fact_title: string;
  fact_content: string;
  source_url: string | null;
  source_name: string | null;
  topic_category: string;
}

interface WebSearchResult {
  url: string;
  title: string;
  description: string;
  markdown?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pillar_slug, topic_seed, location_state, location_city }: ResearchRequest = await req.json();

    if (!pillar_slug || !topic_seed) {
      return new Response(
        JSON.stringify({ success: false, error: "pillar_slug and topic_seed are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Researching topic: ${topic_seed} for pillar: ${pillar_slug}`);

    // Step 1: Get pillar info
    const { data: pillar, error: pillarError } = await supabase
      .from("blog_pillars")
      .select("id, name, content_focus")
      .eq("slug", pillar_slug)
      .single();

    if (pillarError || !pillar) {
      console.error("Pillar not found:", pillarError);
      return new Response(
        JSON.stringify({ success: false, error: "Pillar not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Query knowledge base for relevant facts
    const { data: knowledgeFacts, error: kbError } = await supabase
      .from("content_knowledge_base")
      .select("id, fact_title, fact_content, source_url, source_name, topic_category")
      .eq("pillar_id", pillar.id)
      .eq("is_active", true)
      .limit(10);

    if (kbError) {
      console.error("Knowledge base query error:", kbError);
    }

    const relevantFacts: KnowledgeFact[] = knowledgeFacts || [];
    console.log(`Found ${relevantFacts.length} knowledge base facts`);

    // Step 3: Build search queries based on topic and location
    const searchQueries: string[] = [];
    
    // Primary search query
    let primaryQuery = topic_seed;
    if (location_city && location_state) {
      primaryQuery = `${topic_seed} ${location_city} ${location_state}`;
    } else if (location_state) {
      primaryQuery = `${topic_seed} ${location_state}`;
    }
    searchQueries.push(primaryQuery);

    // Add related search queries based on pillar focus
    if (pillar_slug === "tenants") {
      searchQueries.push(`Section 8 ${topic_seed} eligibility requirements`);
      searchQueries.push(`HUD housing choice voucher ${topic_seed}`);
    } else if (pillar_slug === "landlords") {
      // Focus on property management software and tools
      searchQueries.push(`${topic_seed} software review 2025`);
      searchQueries.push(`best ${topic_seed} for landlords pricing`);
      searchQueries.push(`${topic_seed} vs alternatives comparison`);
    } else if (pillar_slug === "property-managers") {
      // Focus on PM platforms and portfolio analytics
      searchQueries.push(`${topic_seed} property management software comparison 2025`);
      searchQueries.push(`best ${topic_seed} for property managers features`);
      searchQueries.push(`${topic_seed} pricing and integrations`);
    } else if (pillar_slug === "real-estate") {
      searchQueries.push(`${topic_seed} real estate market trends 2025`);
      searchQueries.push(`${topic_seed} investment analysis`);
    }

    // Step 4: Try Firecrawl search if API key is available
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    const webSearchResults: WebSearchResult[] = [];

    if (firecrawlApiKey) {
      console.log("Performing Firecrawl web search...");
      
      try {
        // Search with first query only to avoid rate limits
        const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: searchQueries[0],
            limit: 5,
            tbs: "qdr:y", // Last year
            scrapeOptions: {
              formats: ["markdown"],
            },
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          
          if (searchData.data && Array.isArray(searchData.data)) {
            for (const result of searchData.data) {
              webSearchResults.push({
                url: result.url || "",
                title: result.title || "",
                description: result.description || "",
                markdown: result.markdown?.substring(0, 2000) || "", // Limit content size
              });
            }
          }
          console.log(`Found ${webSearchResults.length} web search results`);
        } else {
          console.error("Firecrawl search failed:", await searchResponse.text());
        }
      } catch (firecrawlError) {
        console.error("Firecrawl error:", firecrawlError);
      }
    } else {
      console.log("Firecrawl API key not configured, skipping web search");
    }

    // Step 5: Build authoritative source suggestions
    const authoritativeSources = [
      { name: "HUD.gov", url: "https://www.hud.gov/topics/housing_choice_voucher_program_section_8" },
      { name: "NLIHC", url: "https://nlihc.org/" },
      { name: "National Housing Law Project", url: "https://www.nhlp.org/" },
    ];

    // Add location-specific sources
    if (location_state) {
      authoritativeSources.push({
        name: `${location_state} Housing Authority`,
        url: `https://www.hud.gov/states/${location_state.toLowerCase().substring(0, 2)}`,
      });
    }

    const researchContext = {
      success: true,
      pillar: {
        id: pillar.id,
        name: pillar.name,
        content_focus: pillar.content_focus,
      },
      topic_seed,
      location: {
        state: location_state || null,
        city: location_city || null,
      },
      knowledge_base_facts: relevantFacts,
      web_search_results: webSearchResults,
      authoritative_sources: authoritativeSources,
      search_queries_used: searchQueries,
    };

    console.log("Research complete:", JSON.stringify({
      facts_count: relevantFacts.length,
      web_results_count: webSearchResults.length,
    }));

    return new Response(
      JSON.stringify(researchContext),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Research error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
