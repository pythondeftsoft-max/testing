import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SitemapRequest {
  configId: string;
  domain?: string;
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

    const { configId, domain }: SitemapRequest = await req.json();

    console.log('Generating sitemap for config:', configId);

    // Get white label config and domain
    const { data: config, error: configError } = await supabase
      .from('white_label_configs')
      .select('custom_domain, custom_subdomain')
      .eq('id', configId)
      .single();

    if (configError) throw configError;

    const baseUrl = domain || config.custom_domain || `${config.custom_subdomain}.lovable.app` || 'localhost:3000';
    const siteUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

    // Get all published content pages
    const { data: pages, error: pagesError } = await supabase
      .from('white_label_content')
      .select('slug, updated_at, meta_description')
      .eq('config_id', configId)
      .eq('is_published', true)
      .order('updated_at', { ascending: false });

    if (pagesError) throw pagesError;

    // Get all published structured pages
    const { data: structuredPages, error: structuredError } = await supabase
      .from('structured_pages')
      .select('slug, updated_at, page_type')
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    if (structuredError) throw structuredError;

    // Generate XML sitemap
    const sitemapEntries = [
      // Homepage
      `  <url>
    <loc>${siteUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
      
      // Content pages
      ...(pages || []).map(page => `  <url>
    <loc>${siteUrl}/${page.slug}</loc>
    <lastmod>${new Date(page.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`),

      // Structured SEO pages
      ...(structuredPages || []).map(page => {
        const priority = page.page_type === 'software_comparison' ? '0.7' : '0.8';
        return `  <url>
    <loc>${siteUrl}/${page.slug}</loc>
    <lastmod>${new Date(page.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
      })
    ];

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</urlset>`;

    // Store sitemap in database or storage
    const { error: updateError } = await supabase
      .from('white_label_seo_configs')
      .upsert({
        config_id: configId,
        sitemap_xml: sitemapXml,
        sitemap_last_generated: new Date().toISOString(),
        sitemap_generation_enabled: true
      });

    if (updateError) throw updateError;

    // Generate robots.txt
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml`;

    console.log('Sitemap generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        sitemap: sitemapXml,
        robots: robotsTxt,
        pageCount: (pages || []).length,
        lastGenerated: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in seo-sitemap-generator function:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);