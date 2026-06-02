-- Create SEO page templates table
CREATE TABLE public.seo_page_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  base_title TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'general',
  generate_state_pages BOOLEAN NOT NULL DEFAULT true,
  generate_city_pages BOOLEAN NOT NULL DEFAULT true,
  generate_zipcode_pages BOOLEAN NOT NULL DEFAULT true,
  generate_county_pages BOOLEAN NOT NULL DEFAULT false,
  meta_description_template TEXT,
  content_template TEXT,
  bedrooms_filter INTEGER[],
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SEO generated pages table
CREATE TABLE public.seo_generated_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.seo_page_templates(id) ON DELETE CASCADE,
  location_level TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  meta_description TEXT,
  content TEXT,
  location_state TEXT,
  location_city TEXT,
  location_zipcode TEXT,
  location_county TEXT,
  property_count INTEGER NOT NULL DEFAULT 0,
  last_generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seo_page_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_generated_pages ENABLE ROW LEVEL SECURITY;

-- RLS policies for seo_page_templates (admin only)
CREATE POLICY "Admins can view SEO templates"
ON public.seo_page_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE user_id = auth.uid()
    AND role_name IN ('owner', 'admin_partner')
    AND is_active = true
  )
);

CREATE POLICY "Admins can insert SEO templates"
ON public.seo_page_templates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE user_id = auth.uid()
    AND role_name IN ('owner', 'admin_partner')
    AND is_active = true
  )
);

CREATE POLICY "Admins can update SEO templates"
ON public.seo_page_templates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE user_id = auth.uid()
    AND role_name IN ('owner', 'admin_partner')
    AND is_active = true
  )
);

CREATE POLICY "Admins can delete SEO templates"
ON public.seo_page_templates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE user_id = auth.uid()
    AND role_name IN ('owner', 'admin_partner')
    AND is_active = true
  )
);

-- RLS policies for seo_generated_pages
CREATE POLICY "Anyone can view published SEO pages"
ON public.seo_generated_pages
FOR SELECT
USING (published = true);

CREATE POLICY "Admins can view all SEO pages"
ON public.seo_generated_pages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE user_id = auth.uid()
    AND role_name IN ('owner', 'admin_partner')
    AND is_active = true
  )
);

CREATE POLICY "Admins can insert SEO pages"
ON public.seo_generated_pages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE user_id = auth.uid()
    AND role_name IN ('owner', 'admin_partner')
    AND is_active = true
  )
);

CREATE POLICY "Admins can update SEO pages"
ON public.seo_generated_pages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE user_id = auth.uid()
    AND role_name IN ('owner', 'admin_partner')
    AND is_active = true
  )
);

CREATE POLICY "Admins can delete SEO pages"
ON public.seo_generated_pages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE user_id = auth.uid()
    AND role_name IN ('owner', 'admin_partner')
    AND is_active = true
  )
);

-- Create indexes for performance
CREATE INDEX idx_seo_templates_active ON public.seo_page_templates(active);
CREATE INDEX idx_seo_templates_type ON public.seo_page_templates(template_type);
CREATE INDEX idx_seo_pages_template ON public.seo_generated_pages(template_id);
CREATE INDEX idx_seo_pages_slug ON public.seo_generated_pages(slug);
CREATE INDEX idx_seo_pages_location ON public.seo_generated_pages(location_state, location_city, location_zipcode);
CREATE INDEX idx_seo_pages_published ON public.seo_generated_pages(published);

-- Create trigger for updated_at
CREATE TRIGGER update_seo_templates_updated_at
BEFORE UPDATE ON public.seo_page_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();