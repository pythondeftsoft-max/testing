-- Create domain verifications table (fixed)
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