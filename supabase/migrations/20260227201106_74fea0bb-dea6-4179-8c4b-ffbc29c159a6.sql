
-- Create unified content table
CREATE TABLE public.content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type text NOT NULL DEFAULT 'page',
  template text,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  body text,
  meta_title text,
  meta_description text,
  cta_text text,
  cta_url text,
  featured_image text,
  state text,
  city text,
  canonical_url text,
  schema_type text,
  schema_data jsonb DEFAULT '{}'::jsonb,
  internal_links text[] DEFAULT '{}',
  language text DEFAULT 'en',
  parent_post_id uuid REFERENCES public.content(id) ON DELETE SET NULL,
  pillar_id uuid,
  excerpt text,
  seo_keywords text[] DEFAULT '{}',
  publish_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  -- Blog-specific fields carried over
  content_structure jsonb,
  meta_tags jsonb,
  view_count integer DEFAULT 0,
  featured_image_alt text,
  scheduled_publish_at timestamptz,
  location_targeting jsonb
);

-- Index for common queries
CREATE INDEX idx_content_type ON public.content(content_type);
CREATE INDEX idx_content_status ON public.content(status);
CREATE INDEX idx_content_slug ON public.content(slug);
CREATE INDEX idx_content_template ON public.content(template);
CREATE INDEX idx_content_parent ON public.content(parent_post_id);
CREATE INDEX idx_content_language ON public.content(language);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_updated_at
  BEFORE UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION update_content_updated_at();

-- RLS
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

-- Public read for published content
CREATE POLICY "Anyone can read published content"
  ON public.content FOR SELECT
  USING (status = 'published');

-- Authenticated users can manage content (admin check done in app)
CREATE POLICY "Authenticated users can insert content"
  ON public.content FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update content"
  ON public.content FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete content"
  ON public.content FOR DELETE
  TO authenticated
  USING (true);

-- Service role bypass for edge functions
CREATE POLICY "Service role full access"
  ON public.content FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- View count increment function
CREATE OR REPLACE FUNCTION increment_content_view_count(content_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.content SET view_count = COALESCE(view_count, 0) + 1 WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
