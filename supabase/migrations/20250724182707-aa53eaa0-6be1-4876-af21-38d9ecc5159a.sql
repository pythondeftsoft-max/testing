-- Domain verifications table (simplified, avoiding the is_verified issue)
CREATE TABLE IF NOT EXISTS public.domain_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    domain text NOT NULL UNIQUE,
    verification_token text NOT NULL,
    verified boolean DEFAULT false,
    verified_at timestamp with time zone,
    last_checked_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.domain_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for domain verifications
CREATE POLICY "Users can manage their domain verifications"
ON public.domain_verifications
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.white_label_configs wlc
        WHERE wlc.custom_domain = domain_verifications.domain
        AND wlc.user_id = auth.uid()
    )
);

CREATE POLICY "Public can view verified domains"
ON public.domain_verifications
FOR SELECT
USING (verified = true);

-- Create updated_at trigger for domain verifications
CREATE TRIGGER update_domain_verifications_updated_at
    BEFORE UPDATE ON public.domain_verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_domain_verifications_domain ON public.domain_verifications(domain);
CREATE INDEX IF NOT EXISTS idx_domain_verifications_verified ON public.domain_verifications(verified);
CREATE INDEX IF NOT EXISTS idx_site_performance_config_date ON public.site_performance_metrics(config_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_domain ON public.ssl_certificates(domain);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_status ON public.ssl_certificates(certificate_status);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_expires ON public.ssl_certificates(expires_at);