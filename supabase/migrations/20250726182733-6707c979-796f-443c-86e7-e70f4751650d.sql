-- Create subdomain verifications table
CREATE TABLE public.subdomain_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.white_label_configs(id) ON DELETE CASCADE,
  subdomain TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  last_verified_at TIMESTAMP WITH TIME ZONE,
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verification_attempts INTEGER DEFAULT 0,
  ssl_status TEXT DEFAULT 'unknown',
  dns_status TEXT DEFAULT 'unknown',
  http_status_code INTEGER,
  response_time_ms INTEGER,
  verification_errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(config_id, subdomain)
);

-- Enable RLS
ALTER TABLE public.subdomain_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for subdomain verifications
CREATE POLICY "Config owners can manage subdomain verifications" 
ON public.subdomain_verifications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.white_label_configs wlc 
    WHERE wlc.id = subdomain_verifications.config_id 
    AND wlc.user_id = auth.uid()
  )
);

CREATE POLICY "Public can view active subdomain verifications" 
ON public.subdomain_verifications 
FOR SELECT 
USING (verification_status = 'verified');

-- Create trigger for updated_at
CREATE TRIGGER update_subdomain_verifications_updated_at
BEFORE UPDATE ON public.subdomain_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indices for performance
CREATE INDEX idx_subdomain_verifications_config_id ON public.subdomain_verifications(config_id);
CREATE INDEX idx_subdomain_verifications_subdomain ON public.subdomain_verifications(subdomain);
CREATE INDEX idx_subdomain_verifications_status ON public.subdomain_verifications(verification_status);

-- Add function to get comprehensive domain status
CREATE OR REPLACE FUNCTION public.get_domain_verification_status(p_config_id UUID)
RETURNS TABLE(
  domain_type TEXT,
  domain_value TEXT,
  status TEXT,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  verification_errors JSONB,
  ssl_status TEXT,
  dns_status TEXT
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Return subdomain verification status
  RETURN QUERY
  SELECT 
    'subdomain'::TEXT as domain_type,
    sv.subdomain as domain_value,
    sv.verification_status as status,
    sv.last_verified_at,
    sv.verification_errors,
    sv.ssl_status,
    sv.dns_status
  FROM public.subdomain_verifications sv
  WHERE sv.config_id = p_config_id;
  
  -- Return custom domain verification status
  RETURN QUERY
  SELECT 
    'custom_domain'::TEXT as domain_type,
    dv.domain as domain_value,
    dv.verification_status as status,
    dv.verified_at as last_verified_at,
    COALESCE(dv.verification_errors, '[]'::jsonb) as verification_errors,
    'unknown'::TEXT as ssl_status,
    'unknown'::TEXT as dns_status
  FROM public.domain_verifications dv
  WHERE dv.white_label_config_id = p_config_id;
END;
$$;