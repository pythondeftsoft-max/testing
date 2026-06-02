
-- 1. Payment Standards Schedule
CREATE TABLE public.agency_payment_standards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  bedroom_count INTEGER NOT NULL CHECK (bedroom_count >= 0 AND bedroom_count <= 8),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exception_area_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, bedroom_count, effective_date, exception_area_name)
);

ALTER TABLE public.agency_payment_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view payment standards"
  ON public.agency_payment_standards FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_payment_standards.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
  ));

CREATE POLICY "Agency admins can manage payment standards"
  ON public.agency_payment_standards FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_payment_standards.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
      AND agency_staff.role IN ('agency_admin', 'executive_director')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_payment_standards.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
      AND agency_staff.role IN ('agency_admin', 'executive_director')
  ));

-- 2. Income Limits
CREATE TABLE public.agency_income_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  metro_area_name TEXT,
  household_size INTEGER NOT NULL CHECK (household_size >= 1 AND household_size <= 8),
  extremely_low NUMERIC(10,2) NOT NULL DEFAULT 0,
  very_low NUMERIC(10,2) NOT NULL DEFAULT 0,
  low NUMERIC(10,2) NOT NULL DEFAULT 0,
  median_income NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, fiscal_year, household_size, metro_area_name)
);

ALTER TABLE public.agency_income_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view income limits"
  ON public.agency_income_limits FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_income_limits.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
  ));

CREATE POLICY "Agency admins can manage income limits"
  ON public.agency_income_limits FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_income_limits.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
      AND agency_staff.role IN ('agency_admin', 'executive_director')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_income_limits.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
      AND agency_staff.role IN ('agency_admin', 'executive_director')
  ));

-- 3. Inspection Fees
CREATE TABLE public.agency_inspection_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('initial', 'annual', 'reinspection', 'special', 'quality_control')),
  fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_by TEXT NOT NULL DEFAULT 'landlord' CHECK (paid_by IN ('agency', 'landlord', 'tenant')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, inspection_type)
);

ALTER TABLE public.agency_inspection_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view inspection fees"
  ON public.agency_inspection_fees FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_inspection_fees.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
  ));

CREATE POLICY "Agency admins can manage inspection fees"
  ON public.agency_inspection_fees FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_inspection_fees.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
      AND agency_staff.role IN ('agency_admin', 'executive_director')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_inspection_fees.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
      AND agency_staff.role IN ('agency_admin', 'executive_director')
  ));

-- Triggers for updated_at
CREATE TRIGGER update_agency_payment_standards_updated_at
  BEFORE UPDATE ON public.agency_payment_standards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_income_limits_updated_at
  BEFORE UPDATE ON public.agency_income_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_inspection_fees_updated_at
  BEFORE UPDATE ON public.agency_inspection_fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
