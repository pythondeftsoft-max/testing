-- Create domain verifications table
CREATE TABLE IF NOT EXISTS public.domain_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    domain text NOT NULL UNIQUE,
    verification_token text NOT NULL,
    is_verified boolean DEFAULT false,
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
USING (is_verified = true);

-- Create updated_at trigger for domain verifications
CREATE TRIGGER update_domain_verifications_updated_at
    BEFORE UPDATE ON public.domain_verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create site performance metrics table
CREATE TABLE IF NOT EXISTS public.site_performance_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id uuid NOT NULL REFERENCES public.white_label_configs(id) ON DELETE CASCADE,
    metric_date date NOT NULL DEFAULT CURRENT_DATE,
    page_load_time_ms integer,
    first_contentful_paint_ms integer,
    largest_contentful_paint_ms integer,
    cumulative_layout_shift numeric(4,3),
    total_blocking_time_ms integer,
    seo_score integer CHECK (seo_score >= 0 AND seo_score <= 100),
    accessibility_score integer CHECK (accessibility_score >= 0 AND accessibility_score <= 100),
    best_practices_score integer CHECK (best_practices_score >= 0 AND best_practices_score <= 100),
    performance_score integer CHECK (performance_score >= 0 AND performance_score <= 100),
    uptime_percentage numeric(5,2),
    error_rate_percentage numeric(5,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(config_id, metric_date)
);

-- Enable RLS
ALTER TABLE public.site_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for site performance metrics
CREATE POLICY "Config owners can manage their performance metrics"
ON public.site_performance_metrics
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.white_label_configs wlc
        WHERE wlc.id = site_performance_metrics.config_id
        AND wlc.user_id = auth.uid()
    )
);

-- Create updated_at trigger
CREATE TRIGGER update_site_performance_metrics_updated_at
    BEFORE UPDATE ON public.site_performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create SSL certificates table for tracking
CREATE TABLE IF NOT EXISTS public.ssl_certificates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    domain text NOT NULL UNIQUE,
    config_id uuid REFERENCES public.white_label_configs(id) ON DELETE CASCADE,
    certificate_status text NOT NULL DEFAULT 'pending' CHECK (certificate_status IN ('pending', 'active', 'expired', 'failed')),
    issued_at timestamp with time zone,
    expires_at timestamp with time zone,
    auto_renew boolean DEFAULT true,
    certificate_authority text DEFAULT 'lets_encrypt',
    last_renewal_attempt timestamp with time zone,
    renewal_errors text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ssl_certificates ENABLE ROW LEVEL SECURITY;

-- Create policies for SSL certificates
CREATE POLICY "Config owners can manage their SSL certificates"
ON public.ssl_certificates
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.white_label_configs wlc
        WHERE wlc.id = ssl_certificates.config_id
        AND wlc.user_id = auth.uid()
    )
);

-- Create updated_at trigger
CREATE TRIGGER update_ssl_certificates_updated_at
    BEFORE UPDATE ON public.ssl_certificates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_domain_verifications_domain ON public.domain_verifications(domain);
CREATE INDEX IF NOT EXISTS idx_domain_verifications_verified ON public.domain_verifications(is_verified);
CREATE INDEX IF NOT EXISTS idx_site_performance_config_date ON public.site_performance_metrics(config_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_domain ON public.ssl_certificates(domain);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_status ON public.ssl_certificates(certificate_status);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_expires ON public.ssl_certificates(expires_at);