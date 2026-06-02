ALTER TABLE public.tenant_profiles
  ADD COLUMN IF NOT EXISTS current_rent_portion text,
  ADD COLUMN IF NOT EXISTS seo_source text,
  ADD COLUMN IF NOT EXISTS seo_template_type text,
  ADD COLUMN IF NOT EXISTS seo_city text,
  ADD COLUMN IF NOT EXISTS seo_state text,
  ADD COLUMN IF NOT EXISTS seo_page_url text;