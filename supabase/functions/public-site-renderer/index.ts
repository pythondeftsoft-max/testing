import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const domain = url.searchParams.get('domain');
    const subdomain = url.searchParams.get('subdomain');
    const path = url.searchParams.get('path') || '/';

    if (!domain && !subdomain) {
      return new Response(
        JSON.stringify({ error: 'Domain or subdomain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Rendering site for domain: ${domain}, subdomain: ${subdomain}, path: ${path}`);

    // Get white-label configuration
    let config;
    if (domain) {
      const { data } = await supabase
        .from('white_label_configs')
        .select(`
          *,
          white_label_themes(*),
          white_label_page_components(*)
        `)
        .eq('custom_domain', domain)
        .eq('is_active', true)
        .single();
      config = data;
    } else {
      // Check for custom_subdomain first (for subdomains of custom domains)
      const { data: customSubdomainData } = await supabase
        .from('white_label_configs')
        .select(`
          *,
          white_label_themes(*),
          white_label_page_components(*)
        `)
        .eq('custom_subdomain', subdomain)
        .eq('is_active', true)
        .single();
      
      if (customSubdomainData) {
        config = customSubdomainData;
      } else {
        // Fallback to regular subdomain lookup
        const { data } = await supabase
          .from('white_label_configs')
          .select(`
            *,
            white_label_themes(*),
            white_label_page_components(*)
          `)
          .eq('subdomain', subdomain)
          .eq('is_active', true)
          .single();
        config = data;
      }
    }

    if (!config) {
      return new Response(
        JSON.stringify({ error: 'White-label configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active theme
    const activeTheme = config.white_label_themes?.find(theme => theme.is_active);
    
    // Get page components for the current page
    const pageType = path === '/' ? 'landing' : 'content';
    const pageComponents = config.white_label_page_components?.filter(comp => 
      comp.page_type === pageType && comp.is_visible
    ).sort((a, b) => a.position_order - b.position_order);

    // Generate HTML response
    const html = generateHTML({
      config,
      theme: activeTheme,
      pageComponents,
      path,
      domain: domain || `${subdomain}.yourdomain.com`
    });

    // Log analytics
    await supabase.functions.invoke('analytics-tracker', {
      body: {
        config_id: config.id,
        event_type: 'page_view',
        page_path: path,
        domain: domain || subdomain,
        user_agent: req.headers.get('user-agent'),
        referrer: req.headers.get('referer'),
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      }
    });

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Site rendering error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        message: (error instanceof Error ? error.message : String(error)) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateHTML({ config, theme, pageComponents, path, domain }) {
  const cssVariables = theme?.css_variables || {};
  const customFonts = theme?.custom_fonts || {};
  
  // Generate CSS custom properties
  const cssProps = Object.entries(cssVariables)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join('\n');

  // Generate font imports
  const fontImports = Object.values(customFonts)
    .filter(font => font?.url)
    .map(font => `@import url('${font.url}');`)
    .join('\n');

  const title = config.company_name;
  const description = `${config.company_name} - Professional Services`;
  const keywords = '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  ${keywords ? `<meta name="keywords" content="${keywords}">` : ''}
  
  <!-- Open Graph -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://${domain}${path}">
  ${config.logo_url ? `<meta property="og:image" content="${config.logo_url}">` : ''}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  ${config.logo_url ? `<meta name="twitter:image" content="${config.logo_url}">` : ''}
  
  <!-- Favicon -->
  ${config.favicon_url ? `<link rel="icon" type="image/x-icon" href="${config.favicon_url}">` : ''}
  
  <style>
    ${fontImports}
    
    :root {
${cssProps}
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: var(--font-primary, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      line-height: 1.6;
      color: var(--color-text, #333);
      background-color: var(--color-background, #fff);
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    header {
      background: var(--color-primary, #007bff);
      color: var(--color-primary-text, white);
      padding: 1rem 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .logo {
      height: 40px;
      width: auto;
    }
    
    .nav {
      display: flex;
      gap: 2rem;
    }
    
    .nav a {
      color: inherit;
      text-decoration: none;
      font-weight: 500;
      transition: opacity 0.2s;
    }
    
    .nav a:hover {
      opacity: 0.8;
    }
    
    main {
      min-height: 70vh;
      padding: 2rem 0;
    }
    
    .hero {
      text-align: center;
      padding: 4rem 0;
      background: linear-gradient(135deg, var(--color-primary, #007bff), var(--color-secondary, #6c757d));
      color: white;
      margin-bottom: 2rem;
    }
    
    .hero h1 {
      font-size: 3rem;
      margin-bottom: 1rem;
      font-weight: 700;
    }
    
    .hero p {
      font-size: 1.25rem;
      opacity: 0.9;
    }
    
    .content {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    .content h1, .content h2, .content h3 {
      margin-bottom: 1rem;
      color: var(--color-heading, #2c3e50);
    }
    
    .content p {
      margin-bottom: 1rem;
    }
    
    footer {
      background: var(--color-footer-bg, #f8f9fa);
      color: var(--color-footer-text, #6c757d);
      text-align: center;
      padding: 2rem 0;
      margin-top: 4rem;
    }
    
    .btn {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: var(--color-accent, #28a745);
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    
    .btn:hover {
      background: var(--color-accent-hover, #218838);
    }
    
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        gap: 1rem;
      }
      
      .nav {
        gap: 1rem;
      }
      
      .hero h1 {
        font-size: 2rem;
      }
      
      .hero p {
        font-size: 1rem;
      }
    }
  </style>
  
  <!-- Analytics -->
  <script>
    (function() {
      // Track page view
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config_id: '${config.id}',
          event_type: 'page_view',
          page_path: '${path}',
          timestamp: new Date().toISOString()
        })
      }).catch(console.error);
    })();
  </script>
</head>
<body>
  <header>
    <div class="container">
      <div class="header-content">
        <div class="logo-section">
          ${config.logo_url ? 
            `<img src="${config.logo_url}" alt="${config.company_name}" class="logo">` : 
            `<h2>${config.company_name}</h2>`
          }
        </div>
        <nav class="nav">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/services">Services</a>
          <a href="/contact">Contact</a>
        </nav>
      </div>
    </div>
  </header>

  <main>
    ${path === '/' ? `
      <section class="hero">
        <div class="container">
          <h1>${config.tagline || `Welcome to ${config.company_name}`}</h1>
          <p>${config.description || 'Professional services you can trust'}</p>
          ${config.primary_color ? `<a href="/contact" class="btn">Get Started</a>` : ''}
        </div>
      </section>
    ` : ''}
    
    <div class="container">
      <div class="content">
        <h1>${path === '/' ? `Welcome to ${config.company_name}` : 'Page Not Found'}</h1>
        <p>${path === '/' ? 
          config.description || 'Thank you for visiting our website.' : 
          'The page you are looking for could not be found.'
        }</p>
        
        ${pageComponents?.map(component => `
          <div class="component component-${component.component_type}">
            ${renderComponent(component)}
          </div>
        `).join('') || ''}
      </div>
    </div>
  </main>

  <footer>
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${config.company_name}. All rights reserved.</p>
      ${config.contact_email ? `<p>Contact: ${config.contact_email}</p>` : ''}
    </div>
  </footer>
</body>
</html>`;
}

function renderComponent(component) {
  const data = component.component_data || {};
  
  switch (component.component_type) {
    case 'hero':
      return `
        <section class="hero-component">
          <h2>${data.title || 'Hero Section'}</h2>
          <p>${data.subtitle || 'Hero description'}</p>
          ${data.cta_text ? `<a href="${data.cta_link || '#'}" class="btn">${data.cta_text}</a>` : ''}
        </section>
      `;
    
    case 'text':
      return `
        <section class="text-component">
          ${data.title ? `<h3>${data.title}</h3>` : ''}
          <p>${data.content || 'Text content'}</p>
        </section>
      `;
    
    case 'image':
      return `
        <section class="image-component">
          ${data.image_url ? `<img src="${data.image_url}" alt="${data.alt_text || 'Image'}" style="max-width: 100%; height: auto;">` : ''}
          ${data.caption ? `<p><em>${data.caption}</em></p>` : ''}
        </section>
      `;
    
    case 'contact_form':
      return `
        <section class="contact-form-component">
          <h3>${data.title || 'Contact Us'}</h3>
          <form action="/api/contact" method="post">
            <p><input type="text" name="name" placeholder="Your Name" required style="width: 100%; padding: 0.5rem; margin-bottom: 1rem;"></p>
            <p><input type="email" name="email" placeholder="Your Email" required style="width: 100%; padding: 0.5rem; margin-bottom: 1rem;"></p>
            <p><textarea name="message" placeholder="Your Message" required style="width: 100%; padding: 0.5rem; margin-bottom: 1rem; height: 100px;"></textarea></p>
            <p><button type="submit" class="btn">Send Message</button></p>
          </form>
        </section>
      `;
    
    default:
      return `<div>Component: ${component.component_type}</div>`;
  }
}