
-- ===== 1) agency_deal_contacts: multi-contact buying committee =====
CREATE TABLE IF NOT EXISTS public.agency_deal_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.agency_leads(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.pha_prospect_status(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  role TEXT NOT NULL DEFAULT 'other',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_billing BOOLEAN NOT NULL DEFAULT false,
  is_signer BOOLEAN NOT NULL DEFAULT false,
  is_technical BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT deal_contact_parent_check CHECK (
    lead_id IS NOT NULL OR prospect_id IS NOT NULL OR agency_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_deal_contacts_lead ON public.agency_deal_contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_prospect ON public.agency_deal_contacts(prospect_id);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_agency ON public.agency_deal_contacts(agency_id);

ALTER TABLE public.agency_deal_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage deal contacts"
  ON public.agency_deal_contacts FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_deal_contacts_updated_at
  BEFORE UPDATE ON public.agency_deal_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== 2) Extend agency_contracts (additive) =====
ALTER TABLE public.agency_contracts
  ADD COLUMN IF NOT EXISTS billing_start_date DATE,
  ADD COLUMN IF NOT EXISTS first_invoice_date DATE,
  ADD COLUMN IF NOT EXISTS billing_contact_id UUID REFERENCES public.agency_deal_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ap_email TEXT,
  ADD COLUMN IF NOT EXISTS po_required BOOLEAN NOT NULL DEFAULT false;

-- ===== 3) Extend agency_leads with deal sizing + procurement + billing staging =====
ALTER TABLE public.agency_leads
  ADD COLUMN IF NOT EXISTS deal_size TEXT,
  ADD COLUMN IF NOT EXISTS procurement_path TEXT,
  ADD COLUMN IF NOT EXISTS procurement_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS billing_terms JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ===== 4) Extend pha_prospect_status =====
ALTER TABLE public.pha_prospect_status
  ADD COLUMN IF NOT EXISTS deal_size TEXT,
  ADD COLUMN IF NOT EXISTS procurement_path TEXT,
  ADD COLUMN IF NOT EXISTS procurement_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS billing_terms JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ===== 5) Auto-derive deal_size from voucher_count =====
CREATE OR REPLACE FUNCTION public.compute_deal_size(_vouchers INTEGER)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _vouchers IS NULL THEN NULL
    WHEN _vouchers < 500 THEN 'small'
    WHEN _vouchers < 5000 THEN 'mid'
    ELSE 'large'
  END;
$$;

CREATE OR REPLACE FUNCTION public.set_lead_deal_size()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.deal_size IS NULL THEN
    NEW.deal_size := public.compute_deal_size(NEW.voucher_count);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_deal_size ON public.agency_leads;
CREATE TRIGGER trg_lead_deal_size
  BEFORE INSERT OR UPDATE OF voucher_count ON public.agency_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_lead_deal_size();
