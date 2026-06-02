import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// SHA-256 hash function
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate API key and return permissions
async function validateApiKey(supabase: any, apiKey: string): Promise<{ valid: boolean; keyId?: string; permissions?: string[] }> {
  const hash = await hashApiKey(apiKey);
  
  const { data, error } = await supabase
    .from('agent_api_keys')
    .select('id, permissions, is_active, request_count')
    .eq('api_key_hash', hash)
    .single();
  
  if (error || !data || !data.is_active) {
    return { valid: false };
  }
  
  // Update last_used_at and request_count
  await supabase
    .from('agent_api_keys')
    .update({ 
      last_used_at: new Date().toISOString(),
      request_count: (data.request_count || 0) + 1
    })
    .eq('id', data.id);
  
  return { valid: true, keyId: data.id, permissions: data.permissions || ['read'] };
}

// Sanitize slug - ensure URL safe
function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9\/-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Sanitize body content: strip script tags, extract JSON-LD, convert plain text to HTML
function sanitizeBody(rawBody: string | null): { sanitizedBody: string | null; extractedJsonLd: any | null } {
  if (!rawBody || typeof rawBody !== 'string') {
    return { sanitizedBody: rawBody, extractedJsonLd: null };
  }

  let sanitized = rawBody;
  let extractedJsonLd: any = null;

  // 1. Extract <script type="application/ld+json"> blocks
  const jsonLdRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
  const jsonLdBlocks: string[] = [];
  let match;
  while ((match = jsonLdRegex.exec(sanitized)) !== null) {
    jsonLdBlocks.push(match[1].trim());
  }
  sanitized = sanitized.replace(jsonLdRegex, '');

  if (jsonLdBlocks.length > 0) {
    // Try to parse all blocks; use first valid one or array
    const parsed: any[] = [];
    for (const block of jsonLdBlocks) {
      try { parsed.push(JSON.parse(block)); } catch (_) { /* skip malformed */ }
    }
    if (parsed.length === 1) extractedJsonLd = parsed[0];
    else if (parsed.length > 1) extractedJsonLd = parsed;
  }

  // 2. Strip stray JSON-LD text that got concatenated as raw text (not in script tags)
  sanitized = sanitized.replace(/\{"@context"\s*:\s*"https?:\/\/schema\.org"[\s\S]*?\}\s*$/g, '').trim();
  // Also remove partial stray ld+json that starts mid-text
  sanitized = sanitized.replace(/@context"\s*:\s*"https?:\/\/schema\.org[\s\S]*$/g, '').trim();

  // 3. Check if body already has HTML structure
  const hasHtmlTags = /<(?:p|h[1-6]|div|ul|ol|table|section|article|blockquote)\b/i.test(sanitized);

  if (!hasHtmlTags && sanitized.length > 0) {
    // Convert plain text / markdown-ish content to HTML
    const lines = sanitized.split('\n');
    let html = '';
    let currentParagraph = '';

    const flushParagraph = () => {
      const text = currentParagraph.trim();
      if (text) {
        html += `<p>${text}</p>\n`;
      }
      currentParagraph = '';
    };

    // Heading patterns: markdown ## / ### and H2 / H3 markers from n8n pipeline
    const h2Markdown = /^##\s+(.+)$/;
    const h3Markdown = /^###\s+(.+)$/;
    const h2Marker = /^[""]?H2[""]?\s+(.+)$/i;
    const h3Marker = /^[""]?H3[""]?\s+(.+)$/i;
    const h1Marker = /^[""]?H1[""]?\s+(.+)$/i;
    const bodyMarker = /^[""]?H[123]_BODY[""]?$/i;

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        continue;
      }

      // Skip body markers
      if (bodyMarker.test(trimmed)) continue;

      // Check heading patterns
      let headingMatch: RegExpMatchArray | null;

      if ((headingMatch = trimmed.match(h3Markdown)) || (headingMatch = trimmed.match(h3Marker))) {
        flushParagraph();
        html += `<h3>${headingMatch[1].trim()}</h3>\n`;
        continue;
      }
      if ((headingMatch = trimmed.match(h2Markdown)) || (headingMatch = trimmed.match(h2Marker))) {
        flushParagraph();
        html += `<h2>${headingMatch[1].trim()}</h2>\n`;
        continue;
      }
      if ((headingMatch = trimmed.match(h1Marker))) {
        flushParagraph();
        html += `<h2>${headingMatch[1].trim()}</h2>\n`; // Render H1 markers as H2 (page already has H1)
        continue;
      }

      // Accumulate paragraph text
      currentParagraph += (currentParagraph ? ' ' : '') + trimmed;
    }
    flushParagraph();
    sanitized = html.trim();
  }

  return { sanitizedBody: sanitized, extractedJsonLd };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing x-api-key header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { valid, keyId, permissions } = await validateApiKey(supabase, apiKey);
    if (!valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasWriteAccess = permissions?.includes('content:write') || permissions?.includes('all');
    if (!hasWriteAccess) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key lacks content:write permission' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body with robust handling
    let rawBody: any;
    try {
      rawBody = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[content-api] Raw body (first 500 chars):', JSON.stringify(rawBody).substring(0, 500));

    // Handle double-encoded JSON
    if (typeof rawBody === 'string') {
      try { rawBody = JSON.parse(rawBody); } catch (e) { /* ignore */ }
    }

    // Handle wrapped bodies
    let body = rawBody;
    const wrapperKeys = ['body', 'data', 'payload', 'input', 'params'];
    for (const key of wrapperKeys) {
      if (rawBody?.[key] && typeof rawBody[key] === 'object') {
        body = rawBody[key];
        for (const innerKey of wrapperKeys) {
          if ((body as any)?.[innerKey]?.title) {
            body = (body as any)[innerKey];
            break;
          }
        }
        break;
      }
    }

    // Handle case-insensitive field names
    if (!body.title && body.Title) body.title = body.Title;

    console.log('[content-api] Final body keys:', body ? Object.keys(body) : 'null');

    // === UNIFIED CONTENT TABLE ===
    // Accept: content_type, template, title, slug, body, meta_title, meta_description,
    //         cta_text, cta_url, status, state, city, featured_image, schema_type, schema_data, etc.

    // Also support legacy fields for backward compatibility
    const contentType = body.content_type || body.type || 
      (body.content_mode === 'structured_page' ? (body.page_type || 'page') : 
       body.content_mode === 'blog_post' ? 'blog_post' : 'page');
    
    const template = body.template || null;

    if (!body.title || !body.slug) {
      // Try auto-extracting title
      if (!body.title && body.content) {
        const h1Match = body.content.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (h1Match) body.title = h1Match[1].replace(/<[^>]*>/g, '').trim();
        else if (body.seo_title || body.meta_title) body.title = body.seo_title || body.meta_title;
        else if (body.slug) body.title = body.slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      }

      const missing = [];
      if (!body.title) missing.push('title');
      if (!body.slug) missing.push('slug');
      if (missing.length > 0) {
        return new Response(
          JSON.stringify({ success: false, error: `Missing required fields: ${missing.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const finalSlug = sanitizeSlug(body.slug);

    // Check slug uniqueness
    const { data: existingSlug } = await supabase
      .from('content')
      .select('id')
      .eq('slug', finalSlug)
      .single();

    if (existingSlug) {
      return new Response(
        JSON.stringify({ success: false, error: `Slug already exists: ${finalSlug}` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the content record
    const contentData: Record<string, any> = {
      content_type: contentType,
      template: template,
      title: body.title,
      slug: finalSlug,
      status: body.status || body.publish_status || 'draft',
      body: body.body || body.body_content || body.content || null,
      meta_title: body.meta_title || body.seo_title || body.title,
      meta_description: body.meta_description || body.seo_description || null,
      cta_text: body.cta_text || null,
      cta_url: body.cta_url || null,
      featured_image: body.featured_image || body.featured_image_url || null,
      state: body.state || null,
      city: body.city || null,
      canonical_url: body.canonical_url || null,
      schema_type: body.schema_type || 'Article',
      schema_data: body.schema_data || {},
      internal_links: body.internal_links || [],
      language: body.language || 'en',
      parent_post_id: body.parent_post_id || null,
      pillar_id: body.pillar_id || null,
      excerpt: body.excerpt || null,
      seo_keywords: body.seo_keywords || [],
      publish_date: body.publish_date || new Date().toISOString(),
      content_structure: body.content_structure || null,
      meta_tags: body.json_ld ? { json_ld: body.json_ld } : (body.meta_tags || null),
      location_targeting: body.location_targeting || 
        (body.location_state || body.location_city ? { state: body.location_state, city: body.location_city } : null),
    };

    // Sanitize empty strings to null for optional fields
    for (const key of Object.keys(contentData)) {
      if (contentData[key] === '') contentData[key] = null;
    }

    // Sanitize body: strip script tags, extract JSON-LD, convert plain text to HTML
    if (contentData.body) {
      const { sanitizedBody, extractedJsonLd } = sanitizeBody(contentData.body);
      contentData.body = sanitizedBody;
      if (extractedJsonLd && !contentData.meta_tags?.json_ld) {
        contentData.meta_tags = { ...(contentData.meta_tags || {}), json_ld: extractedJsonLd };
      }
      console.log('[content-api] Body sanitized. Has JSON-LD:', !!extractedJsonLd, 'Body length:', sanitizedBody?.length);
    }

    const { data: insertedRow, error: insertError } = await supabase
      .from('content')
      .insert(contentData)
      .select('id, slug, content_type, state, city')
      .single();
    const newContent = (insertedRow ?? {}) as { id: string; slug: string; content_type: string; state: string | null; city: string | null };

    if (insertError) {
      console.error('[content-api] Insert error:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: `Database error: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also write to legacy tables for backward compatibility during migration
    try {
      if (contentType === 'blog_post') {
        await supabase.from('blog_posts').insert({
          title: contentData.title,
          slug: contentData.slug,
          content: contentData.body,
          excerpt: contentData.excerpt,
          language: contentData.language || 'en',
          seo_title: contentData.meta_title,
          seo_description: contentData.meta_description,
          seo_keywords: contentData.seo_keywords,
          featured_image_url: contentData.featured_image,
          parent_post_id: contentData.parent_post_id,
          pillar_id: contentData.pillar_id,
          content_structure: contentData.content_structure,
          meta_tags: contentData.meta_tags,
          status: contentData.status,
          published_at: contentData.publish_date,
        });
      } else {
        await supabase.from('structured_pages').insert({
          page_type: contentType,
          slug: contentData.slug,
          title: contentData.title,
          state: contentData.state,
          city: contentData.city,
          meta_title: contentData.meta_title,
          meta_description: contentData.meta_description,
          canonical_url: contentData.canonical_url,
          h1: contentData.meta_title || contentData.title,
          body_content: contentData.body,
          cta_block: contentData.cta_text ? `<a href="${contentData.cta_url || '#'}">${contentData.cta_text}</a>` : null,
          internal_links: contentData.internal_links,
          featured_image: contentData.featured_image,
          schema_type: contentData.schema_type,
          schema_data: contentData.schema_data,
          status: contentData.status,
          publish_date: contentData.publish_date,
        });
      }
    } catch (legacyErr) {
      console.warn('[content-api] Legacy table write failed (non-blocking):', legacyErr);
    }

    // Build structured URL based on content type + location
    const baseUrl = req.headers.get('origin') || 'https://openkey-housing-hub.lovable.app';
    const state = (newContent.state || '').toLowerCase().replace(/\s+/g, '-');
    const city = (newContent.city || '').toLowerCase().replace(/\s+/g, '-');
    
    const typePathMap: Record<string, string> = {
      section8_city: 'section-8',
      section8_state: 'section-8',
      landlord_city: 'landlords',
      property_management_city: 'property-management',
      rent_data_city: 'rent-data',
    };

    let urlPath: string;
    if (contentType === 'blog_post') {
      urlPath = `/blog/${newContent.slug}`;
    } else if (typePathMap[contentType] && state && city) {
      urlPath = `/${typePathMap[contentType]}/${state}/${city}`;
    } else if (typePathMap[contentType] && state) {
      urlPath = `/${typePathMap[contentType]}/${state}`;
    } else {
      urlPath = `/${newContent.slug}`;
    }

    console.log(`[content-api] Created content: ${newContent.slug} (${contentType}) -> ${urlPath} by key ${keyId}`);

    return new Response(
      JSON.stringify({
        success: true,
        content_id: newContent.id,
        slug: newContent.slug,
        content_type: newContent.content_type,
        url: `${baseUrl}${urlPath}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[content-api] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
