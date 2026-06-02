import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TranslationRequest {
  post_id: string;
  target_languages: string[];
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  status: string;
  category_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  content_structure: any;
  pillar_id: string | null;
  meta_tags: any;
}

interface TranslationResult {
  language: string;
  success: boolean;
  slug?: string;
  error?: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  pt: 'Portuguese',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  vi: 'Vietnamese',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  hi: 'Hindi',
  ru: 'Russian',
  ar: 'Arabic',
};

// Helper to process translations in batches
async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { post_id, target_languages }: TranslationRequest = await req.json();

    if (!post_id || !target_languages || target_languages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'post_id and target_languages are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the source post
    const { data: sourcePost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', post_id)
      .single();

    if (fetchError || !sourcePost) {
      return new Response(
        JSON.stringify({ error: 'Source post not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter out English and prepare languages to translate
    const languagesToTranslate = target_languages.filter(lang => lang !== 'en');

    // Helper function to translate a single language
    async function translateSingleLanguage(langCode: string): Promise<TranslationResult> {
      try {
        // Check if translation already exists
        const { data: existing } = await supabase
          .from('blog_posts')
          .select('id, slug')
          .eq('parent_post_id', post_id)
          .eq('language', langCode)
          .single();

        if (existing) {
          return {
            language: langCode,
            success: true,
            slug: existing.slug,
            error: 'Translation already exists',
          };
        }

        // Prepare content for translation
        const contentToTranslate = {
          title: sourcePost.title,
          excerpt: sourcePost.excerpt || '',
          content: sourcePost.content || '',
          seo_title: sourcePost.seo_title || sourcePost.title,
          seo_description: sourcePost.seo_description || '',
          seo_keywords: sourcePost.seo_keywords || [],
          featured_image_alt: sourcePost.featured_image_alt || '',
        };

        const languageName = LANGUAGE_NAMES[langCode] || langCode;

        // Call Lovable AI for translation
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are a professional translator specializing in real estate and housing content. Translate the following blog post content from English to ${languageName}. 
                
IMPORTANT RULES:
1. Preserve ALL markdown formatting, HTML tags, and structure exactly as they appear
2. Maintain the same tone and style appropriate for ${languageName}-speaking audiences
3. Keep proper nouns, brand names (like "OpenKey Housing"), and technical terms that don't translate
4. Ensure SEO keywords are translated to their most searched equivalents in ${languageName}
5. Return ONLY valid JSON with no additional text

Return a JSON object with these exact keys:
- title: translated title
- excerpt: translated excerpt
- content: translated content (preserve all markdown/HTML)
- seo_title: translated SEO title (max 60 chars)
- seo_description: translated meta description (max 160 chars)
- seo_keywords: array of translated keywords
- featured_image_alt: translated alt text for the featured image`,
              },
              {
                role: 'user',
                content: JSON.stringify(contentToTranslate, null, 2),
              },
            ],
            temperature: 0.3,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI translation error for ${langCode}:`, errorText);
          return {
            language: langCode,
            success: false,
            error: `AI translation failed: ${aiResponse.status}`,
          };
        }

        const aiData = await aiResponse.json();
        const translatedContent = aiData.choices?.[0]?.message?.content;

        if (!translatedContent) {
          return {
            language: langCode,
            success: false,
            error: 'No translation returned from AI',
          };
        }

        // Parse the translated content
        let parsed;
        try {
          // Clean up potential markdown code blocks
          let cleanContent = translatedContent.trim();
          if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.slice(7);
          } else if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.slice(3);
          }
          if (cleanContent.endsWith('```')) {
            cleanContent = cleanContent.slice(0, -3);
          }
          parsed = JSON.parse(cleanContent.trim());
        } catch (parseError) {
          console.error(`Failed to parse translation for ${langCode}:`, translatedContent);
          return {
            language: langCode,
            success: false,
            error: 'Failed to parse AI response',
          };
        }

        // Generate unique slug for translation
        const translatedSlug = `${sourcePost.slug}-${langCode}`;

        // Insert the translated post
        const { data: newPost, error: insertError } = await supabase
          .from('blog_posts')
          .insert({
            title: parsed.title || sourcePost.title,
            slug: translatedSlug,
            content: parsed.content || sourcePost.content,
            excerpt: parsed.excerpt || sourcePost.excerpt,
            featured_image_url: sourcePost.featured_image_url,
            featured_image_alt: parsed.featured_image_alt || sourcePost.featured_image_alt,
            status: 'published',
            category_id: sourcePost.category_id,
            seo_title: parsed.seo_title || parsed.title,
            seo_description: parsed.seo_description,
            seo_keywords: parsed.seo_keywords || [],
            content_structure: sourcePost.content_structure,
            pillar_id: sourcePost.pillar_id,
            meta_tags: sourcePost.meta_tags,
            language: langCode,
            parent_post_id: post_id,
            published_at: new Date().toISOString(),
            author_id: null,
            view_count: 0,
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Insert error for ${langCode}:`, insertError);
          return {
            language: langCode,
            success: false,
            error: insertError.message,
          };
        }

        return {
          language: langCode,
          success: true,
          slug: translatedSlug,
        };

      } catch (langError: any) {
        console.error(`Error translating to ${langCode}:`, langError);
        return {
          language: langCode,
          success: false,
          error: (langError instanceof Error ? langError.message : String(langError)) || 'Unknown error',
        };
      }
    }

    // Process translations in parallel batches of 4 to respect API rate limits
    console.log(`Starting parallel translation for ${languagesToTranslate.length} languages`);
    const results = await processBatch(languagesToTranslate, 4, translateSingleLanguage);
    console.log(`Completed all translations`);

    const successCount = results.filter(r => r.success && !r.error?.includes('already exists')).length;
    const existingCount = results.filter(r => r.error?.includes('already exists')).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${successCount} translation(s), ${existingCount} already existed, ${failCount} failed`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
