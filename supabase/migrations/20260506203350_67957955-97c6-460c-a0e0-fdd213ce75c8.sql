
CREATE TABLE IF NOT EXISTS public.agency_hap_payments_legacy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  landlord_id uuid NULL,
  landlord_name_text text NULL,
  tenant_name_text text NULL,
  unit_address text NULL,
  contract_number text NULL,
  payment_date date NOT NULL,
  gross_rent numeric NULL,
  hap_amount numeric NOT NULL DEFAULT 0,
  tenant_portion numeric NULL,
  payment_method text NULL,
  source_reference text NULL,
  source_external_id text NULL,
  notes text NULL,
  imported_by uuid NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hap_legacy_agency ON public.agency_hap_payments_legacy(agency_id);
CREATE INDEX IF NOT EXISTS idx_hap_legacy_landlord ON public.agency_hap_payments_legacy(landlord_id);
CREATE INDEX IF NOT EXISTS idx_hap_legacy_paydate ON public.agency_hap_payments_legacy(agency_id, payment_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hap_legacy_source ON public.agency_hap_payments_legacy(agency_id, source_external_id) WHERE source_external_id IS NOT NULL;

ALTER TABLE public.agency_hap_payments_legacy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view legacy hap payments"
ON public.agency_hap_payments_legacy FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.agency_id = agency_hap_payments_legacy.agency_id
      AND s.user_id = auth.uid()
      AND s.is_active = true
  )
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Staff manage legacy hap payments"
ON public.agency_hap_payments_legacy FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.agency_id = agency_hap_payments_legacy.agency_id
      AND s.user_id = auth.uid()
      AND s.is_active = true
      AND s.role IN ('agency_admin','executive_director','finance')
  )
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.agency_id = agency_hap_payments_legacy.agency_id
      AND s.user_id = auth.uid()
      AND s.is_active = true
      AND s.role IN ('agency_admin','executive_director','finance')
  )
  OR public.is_admin(auth.uid())
);

CREATE TRIGGER trg_hap_legacy_updated_at
BEFORE UPDATE ON public.agency_hap_payments_legacy
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.agency_landlords ADD COLUMN IF NOT EXISTS source_external_id text;
ALTER TABLE public.voucher_applications ADD COLUMN IF NOT EXISTS source_external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_landlords_source ON public.agency_landlords(agency_id, source_external_id) WHERE source_external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_voucher_applications_source ON public.voucher_applications(agency_id, source_external_id) WHERE source_external_id IS NOT NULL;
