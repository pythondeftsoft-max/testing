
-- 1. Agency Hearings table
CREATE TABLE public.agency_hearings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  voucher_id UUID REFERENCES public.agency_vouchers(id) ON DELETE SET NULL,
  hearing_type TEXT NOT NULL DEFAULT 'other' CHECK (hearing_type IN ('termination','rent_reduction','denial','other')),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','scheduled','held','decision_issued','withdrawn')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_at TIMESTAMPTZ,
  hearing_officer TEXT,
  decision TEXT CHECK (decision IN ('upheld','overturned','modified')),
  decision_date DATE,
  decision_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_hearings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view hearings"
  ON public.agency_hearings FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_hearings.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
  ));

CREATE POLICY "Agency admins can manage hearings"
  ON public.agency_hearings FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_hearings.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
      AND agency_staff.role IN ('agency_admin','executive_director')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_hearings.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
      AND agency_staff.role IN ('agency_admin','executive_director')
  ));

CREATE TRIGGER update_agency_hearings_updated_at
  BEFORE UPDATE ON public.agency_hearings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Additive columns on agency_vouchers
ALTER TABLE public.agency_vouchers
  ADD COLUMN IF NOT EXISTS shopping_deadline DATE,
  ADD COLUMN IF NOT EXISTS extension_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extension_days INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'issued',
  ADD COLUMN IF NOT EXISTS leased_up_at TIMESTAMPTZ;

-- 3. Agency HAP Contracts table
CREATE TABLE public.agency_hap_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  voucher_id UUID REFERENCES public.agency_vouchers(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL,
  landlord_id UUID,
  property_address TEXT,
  unit_id UUID,
  contract_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_signature','active','expired','terminated')),
  effective_date DATE,
  expiration_date DATE,
  hap_amount NUMERIC(10,2),
  tenant_rent NUMERIC(10,2),
  gross_rent NUMERIC(10,2),
  utility_allowance NUMERIC(10,2),
  bedroom_count INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_hap_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view hap contracts"
  ON public.agency_hap_contracts FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_hap_contracts.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
  ));

CREATE POLICY "Agency admins can manage hap contracts"
  ON public.agency_hap_contracts FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_hap_contracts.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
      AND agency_staff.role IN ('agency_admin','executive_director')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_hap_contracts.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
      AND agency_staff.role IN ('agency_admin','executive_director')
  ));

CREATE TRIGGER update_agency_hap_contracts_updated_at
  BEFORE UPDATE ON public.agency_hap_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
