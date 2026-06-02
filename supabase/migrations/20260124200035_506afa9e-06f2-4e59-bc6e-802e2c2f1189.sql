-- Update Landlords pillar with software/asset tracking focus
UPDATE blog_pillars 
SET 
  content_focus = ARRAY[
    'best-property-management-software',
    'landlord-accounting-software',
    'rent-collection-apps',
    'tenant-screening-tools',
    'rental-property-roi-calculator',
    'net-worth-tracking-for-landlords',
    'real-estate-portfolio-tracking',
    'single-family-rental-investing',
    'multifamily-property-management',
    'commercial-real-estate-basics',
    'finding-section-8-tenants',
    'accepting-housing-vouchers',
    'tenant-retention-strategies',
    'maintenance-cost-reduction',
    'vacancy-reduction-tips'
  ],
  description = 'Property management software, asset tracking, portfolio growth, and tenant acquisition strategies for all asset classes.',
  updated_at = now()
WHERE slug = 'landlords';

-- Update Property Managers pillar with PM software/scaling focus
UPDATE blog_pillars 
SET 
  content_focus = ARRAY[
    'best-property-management-software-2024',
    'pm-software-comparison-buildium-appfolio',
    'maintenance-request-software',
    'accounting-software-for-property-managers',
    'tenant-portal-platforms',
    'multifamily-property-management-guide',
    'commercial-property-management',
    'hoa-management-software',
    'property-portfolio-analytics',
    'owner-reporting-best-practices',
    'asset-performance-tracking',
    'scaling-property-management-business',
    'pm-fee-structures',
    'vendor-management-systems',
    'section-8-tenant-placement',
    'affordable-housing-compliance'
  ],
  description = 'Property management software reviews, portfolio analytics, business scaling strategies, and operations across all asset classes.',
  updated_at = now()
WHERE slug = 'property-managers';

-- Seed knowledge base with software facts for landlords
INSERT INTO content_knowledge_base (pillar_id, topic_category, fact_title, fact_content, source_name, is_active) 
SELECT 
  p.id,
  'software',
  'Stessa Free Accounting',
  'Stessa is a free landlord accounting and portfolio tracking tool acquired by Roofstock. It provides automated income/expense tracking, tax-ready reports, and property performance dashboards at no cost.',
  'Stessa.com',
  true
FROM blog_pillars p WHERE p.slug = 'landlords';

INSERT INTO content_knowledge_base (pillar_id, topic_category, fact_title, fact_content, source_name, is_active) 
SELECT 
  p.id,
  'software',
  'Buildium Pricing Tiers',
  'Buildium starts at $52/month for the Essential plan (up to 20 units), $166/month for Growth (up to 50 units), and $479/month for Premium (unlimited units). All plans include online payments and maintenance tracking.',
  'Buildium.com',
  true
FROM blog_pillars p WHERE p.slug = 'landlords';

INSERT INTO content_knowledge_base (pillar_id, topic_category, fact_title, fact_content, source_name, is_active) 
SELECT 
  p.id,
  'section-8',
  'Section 8 Tenant Retention',
  'Section 8 tenants stay an average of 7+ years compared to 2-3 years for market-rate tenants. This reduces turnover costs including vacancy loss, marketing, and unit preparation expenses.',
  'HUD Research',
  true
FROM blog_pillars p WHERE p.slug = 'landlords';

INSERT INTO content_knowledge_base (pillar_id, topic_category, fact_title, fact_content, source_name, is_active) 
SELECT 
  p.id,
  'asset-tracking',
  'Real Estate Portfolio Tracking Benefits',
  'Tracking net worth across rental properties requires monitoring equity growth, cash flow, appreciation, and debt paydown. Tools like Stessa, Kubera, and Personal Capital help landlords see their complete financial picture.',
  'Industry Best Practice',
  true
FROM blog_pillars p WHERE p.slug = 'landlords';

-- Seed knowledge base with software facts for property managers
INSERT INTO content_knowledge_base (pillar_id, topic_category, fact_title, fact_content, source_name, is_active) 
SELECT 
  p.id,
  'software',
  'AppFolio Minimum Requirements',
  'AppFolio requires a minimum of 50 units to sign up, with pricing starting at $1.40/unit/month. It includes tenant screening, online payments, and maintenance coordination built-in.',
  'AppFolio.com',
  true
FROM blog_pillars p WHERE p.slug = 'property-managers';

INSERT INTO content_knowledge_base (pillar_id, topic_category, fact_title, fact_content, source_name, is_active) 
SELECT 
  p.id,
  'software',
  'Rent Manager Enterprise Features',
  'Rent Manager is designed for portfolios of 200+ units and offers advanced features including custom reporting, API integrations, and multi-entity accounting. Pricing is custom-quoted based on portfolio size.',
  'RentManager.com',
  true
FROM blog_pillars p WHERE p.slug = 'property-managers';

INSERT INTO content_knowledge_base (pillar_id, topic_category, fact_title, fact_content, source_name, is_active) 
SELECT 
  p.id,
  'business',
  'Property Management Fee Structures',
  'Property management fees typically range from 8-12% of collected rent for residential properties and 4-8% for commercial. Additional fees may include leasing fees (50-100% of first month rent) and maintenance markups (10-20%).',
  'NARPM Industry Standards',
  true
FROM blog_pillars p WHERE p.slug = 'property-managers';

INSERT INTO content_knowledge_base (pillar_id, topic_category, fact_title, fact_content, source_name, is_active) 
SELECT 
  p.id,
  'asset-classes',
  'Multifamily Cap Rates 2024',
  'Multifamily properties have average cap rates of 5-7% in 2024, with Class A properties in major metros at the lower end (4.5-5.5%) and Class C properties in secondary markets at the higher end (6.5-8%).',
  'CBRE Research 2024',
  true
FROM blog_pillars p WHERE p.slug = 'property-managers';