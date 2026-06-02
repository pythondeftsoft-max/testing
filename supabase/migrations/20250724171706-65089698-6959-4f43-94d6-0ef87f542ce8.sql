-- Create RPC functions for white label config retrieval

-- Function to get white label config by subdomain
CREATE OR REPLACE FUNCTION public.get_white_label_config_by_subdomain(subdomain_param text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  company_name text,
  company_logo_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  custom_subdomain text,
  custom_domain text,
  favicon_url text,
  footer_text text,
  contact_email text,
  contact_phone text,
  address text,
  is_active boolean,
  subscription_tier text,
  theme_preset text,
  landing_page_config jsonb,
  email_template_config jsonb,
  advanced_customization jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    id,
    user_id,
    company_name,
    company_logo_url,
    primary_color,
    secondary_color,
    accent_color,
    custom_subdomain,
    custom_domain,
    favicon_url,
    footer_text,
    contact_email,
    contact_phone,
    address,
    is_active,
    subscription_tier,
    theme_preset,
    landing_page_config,
    email_template_config,
    advanced_customization,
    created_at,
    updated_at
  FROM public.white_label_configs
  WHERE custom_subdomain = subdomain_param
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Function to get white label config by custom domain
CREATE OR REPLACE FUNCTION public.get_white_label_config_by_domain(domain_param text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  company_name text,
  company_logo_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  custom_subdomain text,
  custom_domain text,
  favicon_url text,
  footer_text text,
  contact_email text,
  contact_phone text,
  address text,
  is_active boolean,
  subscription_tier text,
  theme_preset text,
  landing_page_config jsonb,
  email_template_config jsonb,
  advanced_customization jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    id,
    user_id,
    company_name,
    company_logo_url,
    primary_color,
    secondary_color,
    accent_color,
    custom_subdomain,
    custom_domain,
    favicon_url,
    footer_text,
    contact_email,
    contact_phone,
    address,
    is_active,
    subscription_tier,
    theme_preset,
    landing_page_config,
    email_template_config,
    advanced_customization,
    created_at,
    updated_at
  FROM public.white_label_configs
  WHERE custom_domain = domain_param
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
$$;