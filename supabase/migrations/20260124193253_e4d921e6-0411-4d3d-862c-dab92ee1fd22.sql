-- =============================================
-- SEO BLOG ENGINE - DATABASE SCHEMA
-- =============================================

-- 1. Create blog_pillars table for the 4 permanent content pillars
CREATE TABLE public.blog_pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  url_base TEXT NOT NULL,
  content_focus TEXT[] DEFAULT '{}',
  cta_type TEXT DEFAULT 'none' CHECK (cta_type IN ('soft_signup', 'informational', 'newsletter_only', 'none')),
  rotation_order INT DEFAULT 1,
  last_published_at TIMESTAMPTZ,
  posts_count INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create content_knowledge_base table for verified facts
CREATE TABLE public.content_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id UUID REFERENCES public.blog_pillars(id) ON DELETE CASCADE,
  topic_category TEXT NOT NULL,
  fact_title TEXT NOT NULL,
  fact_content TEXT NOT NULL,
  source_url TEXT,
  source_name TEXT,
  last_verified_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create blog_generation_logs table for tracking daily generation
CREATE TABLE public.blog_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id UUID REFERENCES public.blog_pillars(id) ON DELETE SET NULL,
  topic_seed TEXT,
  location_state TEXT,
  location_city TEXT,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'researching', 'generating', 'success', 'failed', 'rate_limited')),
  research_sources JSONB DEFAULT '[]',
  knowledge_facts_used JSONB DEFAULT '[]',
  tokens_used INT,
  model_used TEXT,
  error_message TEXT,
  generated_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Extend blog_posts table with pillar-based columns
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS pillar_id UUID REFERENCES public.blog_pillars(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS content_structure JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS primary_keyword TEXT,
ADD COLUMN IF NOT EXISTS semantic_keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS internal_links JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS location_state TEXT,
ADD COLUMN IF NOT EXISTS location_city TEXT,
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sources_cited JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_pillars_slug ON public.blog_pillars(slug);
CREATE INDEX IF NOT EXISTS idx_blog_pillars_rotation ON public.blog_pillars(last_published_at, active);
CREATE INDEX IF NOT EXISTS idx_content_knowledge_base_pillar ON public.content_knowledge_base(pillar_id, is_active);
CREATE INDEX IF NOT EXISTS idx_content_knowledge_base_category ON public.content_knowledge_base(topic_category);
CREATE INDEX IF NOT EXISTS idx_blog_generation_logs_status ON public.blog_generation_logs(status, triggered_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_pillar ON public.blog_posts(pillar_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_location ON public.blog_posts(location_state, location_city);

-- 6. Enable RLS on new tables
ALTER TABLE public.blog_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_generation_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for blog_pillars (public read, admin write)
CREATE POLICY "Anyone can view active pillars" ON public.blog_pillars
  FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage pillars" ON public.blog_pillars
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.account_roles
      WHERE user_id = auth.uid()
      AND role_name IN ('owner', 'admin_partner')
      AND is_active = true
    )
  );

-- 8. RLS Policies for content_knowledge_base (admin only)
CREATE POLICY "Admins can view knowledge base" ON public.content_knowledge_base
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.account_roles
      WHERE user_id = auth.uid()
      AND role_name IN ('owner', 'admin_partner')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage knowledge base" ON public.content_knowledge_base
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.account_roles
      WHERE user_id = auth.uid()
      AND role_name IN ('owner', 'admin_partner')
      AND is_active = true
    )
  );

-- 9. RLS Policies for blog_generation_logs (admin only)
CREATE POLICY "Admins can view generation logs" ON public.blog_generation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.account_roles
      WHERE user_id = auth.uid()
      AND role_name IN ('owner', 'admin_partner')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage generation logs" ON public.blog_generation_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.account_roles
      WHERE user_id = auth.uid()
      AND role_name IN ('owner', 'admin_partner')
      AND is_active = true
    )
  );

-- 10. Seed the 4 content pillars
INSERT INTO public.blog_pillars (slug, name, description, url_base, content_focus, cta_type, rotation_order) VALUES
(
  'tenants',
  'Tenants & Section 8',
  'Eligibility, timelines, how programs work, and local housing guidance for Section 8 and voucher housing.',
  '/tenants',
  ARRAY['section-8-eligibility', 'voucher-search-process', 'hud-income-limits', 'housing-authority-timelines', 'portability-rules', 'hqs-inspections', 'fair-market-rent', 'waiting-list-tips'],
  'soft_signup',
  1
),
(
  'landlords',
  'Landlords',
  'Filling vacancies, voucher benefits, compliance and screening, and guaranteed rent education.',
  '/landlords',
  ARRAY['accepting-section-8', 'hap-contract-basics', 'hqs-inspection-prep', 'rent-payment-standards', 'tenant-screening', 'fair-housing-compliance', 'rent-increase-process', 'eviction-procedures'],
  'informational',
  2
),
(
  'property-managers',
  'Property Managers',
  'Workflow education, affordable housing operations, and portfolio-level management concepts.',
  '/property-managers',
  ARRAY['affordable-housing-compliance', 'lihtc-management', 'portfolio-optimization', 'tenant-communication', 'maintenance-workflows', 'occupancy-management', 'reporting-requirements', 'vendor-management'],
  'informational',
  3
),
(
  'real-estate',
  'Real Estate & Market',
  'Housing market trends, affordable housing data, policy changes, and national/state-level insights.',
  '/real-estate',
  ARRAY['housing-market-trends', 'affordable-housing-supply', 'hud-policy-changes', 'fair-market-rent-updates', 'vacancy-rate-analysis', 'rental-market-forecasts', 'housing-legislation', 'economic-indicators'],
  'newsletter_only',
  4
);

-- 11. Create updated_at trigger for new tables
CREATE TRIGGER update_blog_pillars_updated_at
  BEFORE UPDATE ON public.blog_pillars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_knowledge_base_updated_at
  BEFORE UPDATE ON public.content_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();