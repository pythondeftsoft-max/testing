
-- Create hap_payment_batches table
CREATE TABLE public.hap_payment_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  period_month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved', 'disbursed', 'voided')),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_units INTEGER NOT NULL DEFAULT 0,
  total_landlords INTEGER NOT NULL DEFAULT 0,
  generated_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  disbursed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, period_month, batch_number)
);

-- Create hap_batch_items table
CREATE TABLE public.hap_batch_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.hap_payment_batches(id) ON DELETE CASCADE,
  tenant_lease_id UUID REFERENCES public.tenant_leases(id),
  landlord_id UUID,
  unit_id UUID,
  tenant_id UUID,
  voucher_id UUID,
  hap_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tenant_portion NUMERIC(10,2) NOT NULL DEFAULT 0,
  gross_rent NUMERIC(10,2) NOT NULL DEFAULT 0,
  utility_allowance NUMERIC(10,2) NOT NULL DEFAULT 0,
  adjustment_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  adjustment_reason TEXT,
  net_payment NUMERIC(10,2) GENERATED ALWAYS AS (hap_amount + adjustment_amount) STORED,
  status TEXT NOT NULL DEFAULT 'included' CHECK (status IN ('included', 'excluded', 'adjusted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hap_payment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hap_batch_items ENABLE ROW LEVEL SECURITY;

-- Security definer function to check agency membership
CREATE OR REPLACE FUNCTION public.is_agency_staff(_user_id UUID, _agency_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE user_id = _user_id AND agency_id = _agency_id AND is_active = true
  )
$$;

-- RLS for hap_payment_batches
CREATE POLICY "Agency staff can view their batches"
  ON public.hap_payment_batches FOR SELECT TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff can create batches"
  ON public.hap_payment_batches FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff can update batches"
  ON public.hap_payment_batches FOR UPDATE TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

-- RLS for hap_batch_items (via batch -> agency)
CREATE POLICY "Agency staff can view batch items"
  ON public.hap_batch_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hap_payment_batches b
    WHERE b.id = batch_id AND public.is_agency_staff(auth.uid(), b.agency_id)
  ));

CREATE POLICY "Agency staff can create batch items"
  ON public.hap_batch_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.hap_payment_batches b
    WHERE b.id = batch_id AND public.is_agency_staff(auth.uid(), b.agency_id)
  ));

CREATE POLICY "Agency staff can update batch items"
  ON public.hap_batch_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hap_payment_batches b
    WHERE b.id = batch_id AND public.is_agency_staff(auth.uid(), b.agency_id)
  ));

-- Indexes
CREATE INDEX idx_hap_batches_agency ON public.hap_payment_batches(agency_id);
CREATE INDEX idx_hap_batches_period ON public.hap_payment_batches(period_month);
CREATE INDEX idx_hap_batch_items_batch ON public.hap_batch_items(batch_id);
CREATE INDEX idx_hap_batch_items_landlord ON public.hap_batch_items(landlord_id);

-- Updated_at triggers
CREATE TRIGGER update_hap_payment_batches_updated_at
  BEFORE UPDATE ON public.hap_payment_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hap_batch_items_updated_at
  BEFORE UPDATE ON public.hap_batch_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
