import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SitemapXml = () => {
  useEffect(() => {
    const generateAndServe = async () => {
      const baseUrl = 'https://openkeyhousing.com';

      // Fetch published blog posts
      const { data: posts } = await supabase
        .from('blog_posts')
        .select('slug, updated_at, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      // Fetch structured SEO pages via raw query
      const { data: seoPages } = await supabase
        .from('seo_landing_pages' as any)
        .select('target_slug, updated_at')
        .eq('status', 'published');

      // Static pages
      const staticPages = [
        { loc: '/', priority: '1.0', changefreq: 'daily' },
        { loc: '/blog', priority: '0.8', changefreq: 'daily' },
        { loc: '/find-home', priority: '0.8', changefreq: 'daily' },
        { loc: '/about', priority: '0.5', changefreq: 'monthly' },
        { loc: '/section8-info', priority: '0.7', changefreq: 'weekly' },
        { loc: '/faq', priority: '0.5', changefreq: 'monthly' },
        { loc: '/contact', priority: '0.4', changefreq: 'monthly' },
        { loc: '/tenants', priority: '0.7', changefreq: 'weekly' },
        { loc: '/resources', priority: '0.6', changefreq: 'weekly' },
      ];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      // Static pages
      for (const page of staticPages) {
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}${page.loc}</loc>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += `  </url>\n`;
      }

      // Blog posts
      if (posts) {
        for (const post of posts) {
          const lastmod = (post.updated_at || post.published_at || '').split('T')[0];
          xml += `  <url>\n`;
          xml += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
          xml += `    <lastmod>${lastmod}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.7</priority>\n`;
          xml += `  </url>\n`;
        }
      }

      // Structured SEO pages
      if (seoPages && Array.isArray(seoPages)) {
        for (const page of seoPages as any[]) {
          const lastmod = (page.updated_at || '').split('T')[0];
          const slug = page.target_slug || '';
          if (!slug) continue;
          const path = slug.startsWith('/') ? slug : `/${slug}`;
          xml += `  <url>\n`;
          xml += `    <loc>${baseUrl}${path}</loc>\n`;
          xml += `    <lastmod>${lastmod}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.6</priority>\n`;
          xml += `  </url>\n`;
        }
      }

      xml += `</urlset>`;

      // Replace the document with raw XML
      document.open('text/xml');
      document.write(xml);
      document.close();
    };

    generateAndServe();
  }, []);

  return null;
};

export default SitemapXml;
