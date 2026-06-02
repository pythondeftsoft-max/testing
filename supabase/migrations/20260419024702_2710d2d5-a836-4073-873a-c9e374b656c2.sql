-- Per-agency payment rail configuration (Model B: each PHA funds their own payouts)
CREATE TABLE public.agency_payment_rails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  rail_type TEXT NOT NULL CHECK (rail_type IN ('checkbook', 'nacha', 'modern_treasury')),
  display_name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Encrypted credential payload (API keys, account numbers, routing info etc.)
  -- Store as jsonb; values should be wrapped via vault.create_secret() in production.
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Non-secret config (e.g. checkbook account email, default funding source label)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_verified_at TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','failed')),
  verification_error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_payment_rails_agency ON public.agency_payment_rails(agency_id);
CREATE UNIQUE INDEX idx_agency_payment_rails_one_default
  ON public.agency_payment_rails(agency_id) WHERE is_default = true;

ALTER TABLE public.agency_payment_rails ENABLE ROW LEVEL SECURITY;

-- Only agency staff (admin/finance roles) can view/manage their agency's rails
CREATE POLICY "Agency staff can view their payment rails"
ON public.agency_payment_rails FOR SELECT
USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency admins can insert payment rails"
ON public.agency_payment_rails FOR INSERT
WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency admins can update payment rails"
ON public.agency_payment_rails FOR UPDATE
USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency admins can delete payment rails"
ON public.agency_payment_rails FOR DELETE
USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Platform admins manage all rails"
ON public.agency_payment_rails FOR ALL
USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_agency_payment_rails_updated_at
BEFORE UPDATE ON public.agency_payment_rails
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Platform fee tracking on bulk payout batches and items
ALTER TABLE public.bulk_payout_batches
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.housing_authorities(id),
  ADD COLUMN IF NOT EXISTS payment_rail_id UUID REFERENCES public.agency_payment_rails(id),
  ADD COLUMN IF NOT EXISTS platform_fee_per_transaction NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_platform_fees NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_processor_fees NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.bulk_payout_items
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processor_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rail_type TEXT,
  ADD COLUMN IF NOT EXISTS rail_response JSONB;

-- Audit log of platform fees collected (for invoicing PHAs)
CREATE TABLE public.platform_fee_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.bulk_payout_batches(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.bulk_payout_items(id) ON DELETE SET NULL,
  rail_type TEXT NOT NULL,
  payout_amount NUMERIC(12,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL,
  processor_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  invoiced BOOLEAN NOT NULL DEFAULT false,
  invoiced_at TIMESTAMPTZ,
  invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_fee_ledger_agency ON public.platform_fee_ledger(agency_id, created_at DESC);
CREATE INDEX idx_platform_fee_ledger_uninvoiced ON public.platform_fee_ledger(agency_id) WHERE invoiced = false;

ALTER TABLE public.platform_fee_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff view their fee ledger"
ON public.platform_fee_ledger FOR SELECT
USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Platform admins manage fee ledger"
ON public.platform_fee_ledger FOR ALL
USING (public.is_admin(auth.uid()));