-- 1) agency_contracts table
CREATE TABLE IF NOT EXISTS public.agency_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  source_lead_id uuid,
  source_prospect_id uuid,
  arr_amount numeric NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'annual',
  term_months integer NOT NULL DEFAULT 12,
  start_date date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view agency_contracts"
  ON public.agency_contracts FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert agency_contracts"
  ON public.agency_contracts FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update agency_contracts"
  ON public.agency_contracts FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete agency_contracts"
  ON public.agency_contracts FOR DELETE
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_agency_contracts_agency ON public.agency_contracts(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_contracts_status ON public.agency_contracts(status);

-- 2) Conversion tracking columns on pha_prospect_status
ALTER TABLE public.pha_prospect_status
  ADD COLUMN IF NOT EXISTS conversion_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS conversion_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS conversion_owner_user_id uuid;

-- 3) Conversion tracking columns on agency_leads
ALTER TABLE public.agency_leads
  ADD COLUMN IF NOT EXISTS conversion_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS conversion_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS conversion_owner_user_id uuid;

-- 4) updated_at trigger
CREATE TRIGGER trg_agency_contracts_updated_at
  BEFORE UPDATE ON public.agency_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();