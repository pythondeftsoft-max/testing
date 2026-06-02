
-- Create agency_email_settings table
CREATE TABLE public.agency_email_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  sender_mode TEXT NOT NULL DEFAULT 'hybrid' CHECK (sender_mode IN ('hybrid', 'custom_domain')),
  custom_domain TEXT,
  custom_from_email TEXT,
  domain_verified BOOLEAN NOT NULL DEFAULT false,
  domain_verification_records JSONB DEFAULT '[]'::jsonb,
  resend_domain_id TEXT,
  monthly_addon_fee NUMERIC NOT NULL DEFAULT 0,
  enabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agency_email_settings_agency_id_key UNIQUE (agency_id)
);

-- Enable RLS
ALTER TABLE public.agency_email_settings ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage all agency email settings"
  ON public.agency_email_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Agency staff can view their own agency's settings
CREATE POLICY "Agency staff can view own email settings"
  ON public.agency_email_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = agency_email_settings.agency_id
        AND agency_staff.user_id = auth.uid()
        AND agency_staff.is_active = true
    )
  );

-- Agency admin staff can update their own agency's settings
CREATE POLICY "Agency admin staff can update own email settings"
  ON public.agency_email_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = agency_email_settings.agency_id
        AND agency_staff.user_id = auth.uid()
        AND agency_staff.is_active = true
        AND agency_staff.role = 'agency_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = agency_email_settings.agency_id
        AND agency_staff.user_id = auth.uid()
        AND agency_staff.is_active = true
        AND agency_staff.role = 'agency_admin'
    )
  );

-- Agency admin staff can insert settings for their agency
CREATE POLICY "Agency admin staff can insert own email settings"
  ON public.agency_email_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = agency_email_settings.agency_id
        AND agency_staff.user_id = auth.uid()
        AND agency_staff.is_active = true
        AND agency_staff.role = 'agency_admin'
    )
  );

-- Add custom_email_domain_fee to agency_contracts
ALTER TABLE public.agency_contracts
  ADD COLUMN IF NOT EXISTS custom_email_domain_fee NUMERIC NOT NULL DEFAULT 0;

-- Trigger for updated_at
CREATE TRIGGER update_agency_email_settings_updated_at
  BEFORE UPDATE ON public.agency_email_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
