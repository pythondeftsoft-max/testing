
-- Enum for rent calculation types
DO $$ BEGIN
  CREATE TYPE public.rent_calc_type AS ENUM ('initial', 'annual', 'interim', 'biennial');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for notice categories
DO $$ BEGIN
  CREATE TYPE public.notice_category AS ENUM ('recertification', 'termination', 'inspection', 'voucher', 'general');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for notice delivery methods
DO $$ BEGIN
  CREATE TYPE public.notice_delivery_method AS ENUM ('download', 'email', 'mail');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- MODULE 1: Rent Calculations
-- =============================================
CREATE TABLE public.rent_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.tenant_leases(id) ON DELETE SET NULL,
  calculation_type public.rent_calc_type NOT NULL DEFAULT 'initial',
  annual_gross_income NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowances JSONB NOT NULL DEFAULT '{"dependent": 0, "elderly_disabled": 0, "childcare": 0, "medical": 0}'::jsonb,
  annual_adjusted_income NUMERIC(12,2) NOT NULL DEFAULT 0,
  monthly_adjusted_income NUMERIC(12,2) NOT NULL DEFAULT 0,
  ttp NUMERIC(12,2) NOT NULL DEFAULT 0,
  utility_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_standard NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_rent NUMERIC(12,2) NOT NULL DEFAULT 0,
  hap_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tenant_portion NUMERIC(12,2) NOT NULL DEFAULT 0,
  passes_40pct_rule BOOLEAN NOT NULL DEFAULT true,
  calculated_by UUID REFERENCES public.agency_staff(id) ON DELETE SET NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rent_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view rent calculations"
  ON public.rent_calculations FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_staff WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Agency staff can create rent calculations"
  ON public.rent_calculations FOR INSERT TO authenticated
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_staff WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Agency staff can update rent calculations"
  ON public.rent_calculations FOR UPDATE TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_staff WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Agency staff can delete rent calculations"
  ON public.rent_calculations FOR DELETE TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_staff WHERE user_id = auth.uid() AND is_active = true AND role = 'agency_admin'));

CREATE INDEX idx_rent_calculations_agency ON public.rent_calculations(agency_id);
CREATE INDEX idx_rent_calculations_tenant ON public.rent_calculations(tenant_id);

-- =============================================
-- MODULE 2: Notice Templates & Sent Notices
-- =============================================
CREATE TABLE public.agency_notice_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category public.notice_category NOT NULL DEFAULT 'general',
  subject_line TEXT NOT NULL DEFAULT '',
  body_template TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_notice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view notice templates"
  ON public.agency_notice_templates FOR SELECT TO authenticated
  USING (
    agency_id IS NULL OR
    agency_id IN (SELECT agency_id FROM public.agency_staff WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Agency admins can manage notice templates"
  ON public.agency_notice_templates FOR INSERT TO authenticated
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_staff WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Agency admins can update notice templates"
  ON public.agency_notice_templates FOR UPDATE TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_staff WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Agency admins can delete notice templates"
  ON public.agency_notice_templates FOR DELETE TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_staff WHERE user_id = auth.uid() AND is_active = true AND role = 'agency_admin'));

CREATE TABLE public.agency_notices_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.agency_notice_templates(id) ON DELETE SET NULL,
  notice_type public.notice_category NOT NULL DEFAULT 'general',
  generated_pdf_path TEXT,
  sent_by UUID REFERENCES public.agency_staff(id) ON DELETE SET NULL,
  delivery_method public.notice_delivery_method NOT NULL DEFAULT 'download',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_notices_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view sent notices"
  ON public.agency_notices_sent FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_staff WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Agency staff can create sent notices"
  ON public.agency_notices_sent FOR INSERT TO authenticated
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_staff WHERE user_id = auth.uid() AND is_active = true));

CREATE INDEX idx_notices_sent_agency ON public.agency_notices_sent(agency_id);
CREATE INDEX idx_notices_sent_tenant ON public.agency_notices_sent(tenant_id);

-- =============================================
-- MODULE 3: Recertification Scheduler support
-- =============================================
ALTER TABLE public.tenant_leases ADD COLUMN IF NOT EXISTS last_recert_generated DATE;

-- Trigger for updated_at on rent_calculations
CREATE TRIGGER update_rent_calculations_updated_at
  BEFORE UPDATE ON public.rent_calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notice_templates_updated_at
  BEFORE UPDATE ON public.agency_notice_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
