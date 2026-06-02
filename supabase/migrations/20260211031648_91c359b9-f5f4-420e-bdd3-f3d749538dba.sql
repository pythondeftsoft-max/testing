
-- Create enum for page types
CREATE TYPE public.structured_page_type AS ENUM (
  'section8_city',
  'section8_state',
  'landlord_city',
  'property_management_city',
  'software_comparison',
  'rent_data_city'
);

-- Create enum for page status
CREATE TYPE public.structured_page_status AS ENUM (
  'draft',
  'scheduled',
  'published'
);

-- Create structured_pages table
CREATE TABLE public.structured_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_type public.structured_page_type NOT NULL,
  state TEXT,
  city TEXT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  h1 TEXT,
  body_content TEXT,
  cta_block TEXT,
  internal_links JSONB DEFAULT '[]'::jsonb,
  featured_image TEXT,
  schema_type TEXT DEFAULT 'Article',
  schema_data JSONB DEFAULT '{}'::jsonb,
  status public.structured_page_status NOT NULL DEFAULT 'draft',
  publish_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_structured_pages_slug ON public.structured_pages (slug);
CREATE INDEX idx_structured_pages_page_type ON public.structured_pages (page_type);
CREATE INDEX idx_structured_pages_state ON public.structured_pages (state);
CREATE INDEX idx_structured_pages_city ON public.structured_pages (city);
CREATE INDEX idx_structured_pages_status ON public.structured_pages (status);
CREATE INDEX idx_structured_pages_state_city ON public.structured_pages (state, city);

-- Enable RLS
ALTER TABLE public.structured_pages ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
CREATE POLICY "Anyone can read published structured pages"
  ON public.structured_pages
  FOR SELECT
  USING (status = 'published');

-- Admins (owner + admin_partner) can do everything
CREATE POLICY "Admins can manage structured pages"
  ON public.structured_pages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.account_roles
      WHERE account_roles.user_id = auth.uid()
        AND account_roles.role_name IN ('owner', 'admin_partner')
        AND account_roles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.account_roles
      WHERE account_roles.user_id = auth.uid()
        AND account_roles.role_name IN ('owner', 'admin_partner')
        AND account_roles.is_active = true
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_structured_pages_updated_at
  BEFORE UPDATE ON public.structured_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
