// Edge function: generate fresh sitemap.xml from blog posts + programmatic city pages
// Public endpoint — no auth required.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://openkeyhousing.com';

const slugifyCity = (city: string, state: string) => {
  const c = (city || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${c}-${(state || '').toLowerCase().trim()}`;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date().toISOString().split('T')[0];

    // Static pages
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/blog', priority: '0.8', changefreq: 'daily' },
      { loc: '/find-home', priority: '0.8', changefreq: 'daily' },
      { loc: '/about', priority: '0.5', changefreq: 'monthly' },
      { loc: '/section8-info', priority: '0.7', changefreq: 'weekly' },
      { loc: '/section-8-housing', priority: '0.9', changefreq: 'daily' },
      { loc: '/faq', priority: '0.5', changefreq: 'monthly' },
      { loc: '/contact', priority: '0.4', changefreq: 'monthly' },
      { loc: '/tenants', priority: '0.7', changefreq: 'weekly' },
      { loc: '/resources', priority: '0.6', changefreq: 'weekly' },
      { loc: '/landlords/small', priority: '0.7', changefreq: 'weekly' },
      { loc: '/landlords/portfolios', priority: '0.7', changefreq: 'weekly' },
      { loc: '/landlords/investors', priority: '0.7', changefreq: 'weekly' },
      { loc: '/landlords/realtors', priority: '0.7', changefreq: 'weekly' },
      { loc: '/for-agencies', priority: '0.7', changefreq: 'weekly' },
    ];

    // Blog posts
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    // Top 100 cities by PHA count
    const { data: phas } = await supabase
      .from('housing_authorities')
      .select('city, state')
      .not('city', 'is', null)
      .not('state', 'is', null)
      .eq('is_active', true)
      .limit(5000);

    const cityCounts = new Map<string, { city: string; state: string; count: number }>();
    for (const row of phas || []) {
      const key = `${row.city}|${row.state}`;
      const existing = cityCounts.get(key);
      if (existing) existing.count += 1;
      else cityCounts.set(key, { city: row.city, state: row.state, count: 1 });
    }
    const topCities = Array.from(cityCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const page of staticPages) {
      xml += '  <url>\n';
      xml += `    <loc>${SITE_URL}${page.loc}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    for (const post of posts || []) {
      const lastmod = (post.updated_at || post.published_at || today).split('T')[0];
      xml += '  <url>\n';
      xml += `    <loc>${SITE_URL}/blog/${post.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.7</priority>\n';
      xml += '  </url>\n';
    }

    for (const c of topCities) {
      xml += '  <url>\n';
      xml += `    <loc>${SITE_URL}/section-8-housing/${slugifyCity(c.city, c.state)}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }

    xml += '</urlset>';

    return new Response(xml, {
      headers: { ...corsHeaders, 'Content-Type': 'application/xml; charset=utf-8' },
      status: 200,
    });
  } catch (error) {
    console.error('[generate-sitemap] error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
        status: 200,
      }
    );
  }
});
