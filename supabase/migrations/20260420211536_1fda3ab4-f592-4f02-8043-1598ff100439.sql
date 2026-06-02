
-- Repayment Agreements
CREATE TABLE public.agency_repayment_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  original_debt NUMERIC(12,2) NOT NULL CHECK (original_debt > 0),
  monthly_payment NUMERIC(12,2) NOT NULL CHECK (monthly_payment > 0),
  balance_remaining NUMERIC(12,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','defaulted','terminated')),
  reason TEXT NOT NULL CHECK (reason IN ('unreported_income','owed_rent','damages','overpayment','other')),
  notes TEXT,
  last_payment_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_repayment_agreements_agency ON public.agency_repayment_agreements(agency_id);
CREATE INDEX idx_repayment_agreements_tenant ON public.agency_repayment_agreements(tenant_id);
CREATE INDEX idx_repayment_agreements_status ON public.agency_repayment_agreements(status);

ALTER TABLE public.agency_repayment_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff manage repayment agreements"
ON public.agency_repayment_agreements FOR ALL
USING (public.is_agency_staff(auth.uid(), agency_id))
WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Tenants view own repayment agreements"
ON public.agency_repayment_agreements FOR SELECT
USING (auth.uid() = tenant_id);

CREATE TRIGGER trg_repayment_agreements_updated_at
BEFORE UPDATE ON public.agency_repayment_agreements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Repayment Payments
CREATE TABLE public.agency_repayment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.agency_repayment_agreements(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_repayment_payments_agreement ON public.agency_repayment_payments(agreement_id);

ALTER TABLE public.agency_repayment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff manage repayment payments"
ON public.agency_repayment_payments FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.agency_repayment_agreements a
  WHERE a.id = agreement_id AND public.is_agency_staff(auth.uid(), a.agency_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.agency_repayment_agreements a
  WHERE a.id = agreement_id AND public.is_agency_staff(auth.uid(), a.agency_id)
));

CREATE POLICY "Tenants view own repayment payments"
ON public.agency_repayment_payments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.agency_repayment_agreements a
  WHERE a.id = agreement_id AND a.tenant_id = auth.uid()
));

-- Trigger to auto-decrement balance on payment insert
CREATE OR REPLACE FUNCTION public.apply_repayment_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance NUMERIC(12,2);
BEGIN
  UPDATE public.agency_repayment_agreements
  SET balance_remaining = GREATEST(balance_remaining - NEW.amount, 0),
      last_payment_date = NEW.payment_date,
      status = CASE WHEN balance_remaining - NEW.amount <= 0 THEN 'completed' ELSE status END,
      updated_at = now()
  WHERE id = NEW.agreement_id
  RETURNING balance_remaining INTO new_balance;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_repayment_payment
AFTER INSERT ON public.agency_repayment_payments
FOR EACH ROW EXECUTE FUNCTION public.apply_repayment_payment();

-- Accommodation Requests
CREATE TABLE public.agency_accommodation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  accommodation_type TEXT NOT NULL CHECK (accommodation_type IN ('larger_unit','live_in_aide','extended_shopping','transfer','assistance_animal','accessibility_modification','other')),
  description TEXT NOT NULL,
  supporting_docs JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_review','approved','denied','withdrawn')),
  decision_date DATE,
  decision_by UUID,
  decision_notes TEXT,
  denial_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accommodation_requests_agency ON public.agency_accommodation_requests(agency_id);
CREATE INDEX idx_accommodation_requests_tenant ON public.agency_accommodation_requests(tenant_id);
CREATE INDEX idx_accommodation_requests_status ON public.agency_accommodation_requests(status);

ALTER TABLE public.agency_accommodation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff manage accommodation requests"
ON public.agency_accommodation_requests FOR ALL
USING (public.is_agency_staff(auth.uid(), agency_id))
WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Tenants view own accommodation requests"
ON public.agency_accommodation_requests FOR SELECT
USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants create own accommodation requests"
ON public.agency_accommodation_requests FOR INSERT
WITH CHECK (auth.uid() = tenant_id);

CREATE TRIGGER trg_accommodation_requests_updated_at
BEFORE UPDATE ON public.agency_accommodation_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
