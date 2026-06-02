
-- Create white_label_configs table for user-specific branding
CREATE TABLE public.white_label_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  company_logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#1e40af',
  accent_color TEXT DEFAULT '#3b82f6',
  custom_subdomain TEXT UNIQUE,
  custom_domain TEXT UNIQUE,
  favicon_url TEXT,
  footer_text TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for white_label_configs
ALTER TABLE public.white_label_configs ENABLE ROW LEVEL SECURITY;

-- Users can manage their own white label config
CREATE POLICY "Users can manage their own white label config"
  ON public.white_label_configs
  FOR ALL
  USING (user_id = auth.uid());

-- Admins can view all white label configs
CREATE POLICY "Admins can view all white label configs"
  ON public.white_label_configs
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Public read access for active configs (for subdomain detection)
CREATE POLICY "Public can view active white label configs by subdomain"
  ON public.white_label_configs
  FOR SELECT
  USING (is_active = true AND (custom_subdomain IS NOT NULL OR custom_domain IS NOT NULL));

-- Create storage bucket for white label assets
INSERT INTO storage.buckets (id, name, public) VALUES ('white-label-assets', 'white-label-assets', true);

-- Create storage policy for white label assets
CREATE POLICY "Users can upload their white label assets"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'white-label-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their white label assets"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'white-label-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their white label assets"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'white-label-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their white label assets"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'white-label-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public access to white label assets for active configs
CREATE POLICY "Public can view active white label assets"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'white-label-assets' AND 
    EXISTS (
      SELECT 1 FROM public.white_label_configs 
      WHERE is_active = true 
      AND (company_logo_url LIKE '%' || name || '%' OR favicon_url LIKE '%' || name || '%')
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_white_label_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_white_label_configs_updated_at
  BEFORE UPDATE ON public.white_label_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_white_label_configs_updated_at();

-- Function to get white label config by subdomain
CREATE OR REPLACE FUNCTION public.get_white_label_config_by_subdomain(subdomain_param TEXT)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  company_name TEXT,
  company_logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  custom_subdomain TEXT,
  custom_domain TEXT,
  favicon_url TEXT,
  footer_text TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    wlc.id,
    wlc.user_id,
    wlc.company_name,
    wlc.company_logo_url,
    wlc.primary_color,
    wlc.secondary_color,
    wlc.accent_color,
    wlc.custom_subdomain,
    wlc.custom_domain,
    wlc.favicon_url,
    wlc.footer_text,
    wlc.contact_email,
    wlc.contact_phone,
    wlc.address
  FROM public.white_label_configs wlc
  WHERE wlc.is_active = true 
  AND (wlc.custom_subdomain = subdomain_param OR wlc.custom_domain = subdomain_param)
  LIMIT 1;
$$;

-- Function to get white label config by domain
CREATE OR REPLACE FUNCTION public.get_white_label_config_by_domain(domain_param TEXT)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  company_name TEXT,
  company_logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  custom_subdomain TEXT,
  custom_domain TEXT,
  favicon_url TEXT,
  footer_text TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    wlc.id,
    wlc.user_id,
    wlc.company_name,
    wlc.company_logo_url,
    wlc.primary_color,
    wlc.secondary_color,
    wlc.accent_color,
    wlc.custom_subdomain,
    wlc.custom_domain,
    wlc.favicon_url,
    wlc.footer_text,
    wlc.contact_email,
    wlc.contact_phone,
    wlc.address
  FROM public.white_label_configs wlc
  WHERE wlc.is_active = true 
  AND wlc.custom_domain = domain_param
  LIMIT 1;
$$;
