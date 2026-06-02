
-- ========================================
-- screening_criteria: landlord-defined thresholds
-- ========================================
CREATE TABLE public.screening_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL,
  min_credit_score INTEGER NOT NULL DEFAULT 600,
  income_multiplier NUMERIC(3,1) NOT NULL DEFAULT 3.0,
  max_evictions INTEGER NOT NULL DEFAULT 0,
  max_criminal_records INTEGER NOT NULL DEFAULT 0,
  require_employment_verification BOOLEAN NOT NULL DEFAULT true,
  require_rental_history BOOLEAN NOT NULL DEFAULT true,
  custom_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.screening_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage own screening criteria"
  ON public.screening_criteria FOR ALL
  USING (auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = landlord_id);

-- ========================================
-- screening_results: per-applicant outcomes
-- ========================================
CREATE TABLE public.screening_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL,
  tenant_id UUID,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT,
  credit_score INTEGER,
  income_amount NUMERIC(10,2),
  eviction_count INTEGER DEFAULT 0,
  criminal_record_count INTEGER DEFAULT 0,
  employment_verified BOOLEAN DEFAULT false,
  rental_history_verified BOOLEAN DEFAULT false,
  overall_result TEXT NOT NULL DEFAULT 'pending',
  adverse_action_sent BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  criteria_id UUID REFERENCES public.screening_criteria(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.screening_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage own screening results"
  ON public.screening_results FOR ALL
  USING (auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Tenants view own screening results"
  ON public.screening_results FOR SELECT
  USING (auth.uid() = tenant_id);

-- ========================================
-- rent_payment_ledger: tenant rent payments
-- ========================================
CREATE TABLE public.rent_payment_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL,
  tenant_id UUID,
  tenant_name TEXT NOT NULL,
  unit_id UUID,
  property_address TEXT,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  autopay BOOLEAN NOT NULL DEFAULT false,
  stripe_payment_intent_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rent_payment_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage own rent ledger"
  ON public.rent_payment_ledger FOR ALL
  USING (auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Tenants view own rent payments"
  ON public.rent_payment_ledger FOR SELECT
  USING (auth.uid() = tenant_id);

-- Indexes for performance
CREATE INDEX idx_screening_criteria_landlord ON public.screening_criteria(landlord_id);
CREATE INDEX idx_screening_results_landlord ON public.screening_results(landlord_id);
CREATE INDEX idx_screening_results_tenant ON public.screening_results(tenant_id);
CREATE INDEX idx_rent_ledger_landlord ON public.rent_payment_ledger(landlord_id);
CREATE INDEX idx_rent_ledger_tenant ON public.rent_payment_ledger(tenant_id);
CREATE INDEX idx_rent_ledger_status ON public.rent_payment_ledger(status);

-- Updated_at triggers
CREATE TRIGGER update_screening_criteria_updated_at
  BEFORE UPDATE ON public.screening_criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_screening_results_updated_at
  BEFORE UPDATE ON public.screening_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rent_payment_ledger_updated_at
  BEFORE UPDATE ON public.rent_payment_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
