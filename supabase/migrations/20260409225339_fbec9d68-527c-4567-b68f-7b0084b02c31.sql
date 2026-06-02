
-- Utility type enum
CREATE TYPE public.utility_type AS ENUM ('heating', 'cooking', 'electric', 'water_sewer', 'trash', 'other');

-- Reminder type enum
CREATE TYPE public.reminder_type AS ENUM ('recertification_90day', 'recertification_60day', 'recertification_30day', 'inspection_upcoming', 'lease_expiration', 'hap_contract_expiration');

-- Rent reasonableness determination enum
CREATE TYPE public.rent_reasonableness_determination AS ENUM ('pass', 'fail', 'pending');

-- 1. Landlord HAP Statements
CREATE TABLE public.landlord_hap_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  statement_month DATE NOT NULL,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  pdf_path TEXT,
  generated_by UUID REFERENCES public.agency_staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(landlord_id, agency_id, statement_month)
);
ALTER TABLE public.landlord_hap_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view statements" ON public.landlord_hap_statements
  FOR SELECT TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff can create statements" ON public.landlord_hap_statements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Landlords can view own statements" ON public.landlord_hap_statements
  FOR SELECT TO authenticated
  USING (landlord_id = auth.uid());

-- 2. Agency Utility Schedules
CREATE TABLE public.agency_utility_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  bedroom_count INTEGER NOT NULL,
  utility_type public.utility_type NOT NULL,
  monthly_allowance NUMERIC(8,2) NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, bedroom_count, utility_type, effective_date)
);
ALTER TABLE public.agency_utility_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view UA schedules" ON public.agency_utility_schedules
  FOR SELECT TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff can manage UA schedules" ON public.agency_utility_schedules
  FOR ALL TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

-- 3. Rent Comparables
CREATE TABLE public.rent_comparables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  rfta_id UUID,
  address TEXT NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms NUMERIC(3,1) DEFAULT 1,
  square_footage INTEGER,
  monthly_rent NUMERIC(8,2) NOT NULL,
  amenities TEXT,
  unit_condition TEXT,
  date_surveyed DATE NOT NULL DEFAULT CURRENT_DATE,
  surveyed_by UUID REFERENCES public.agency_staff(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rent_comparables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can manage comparables" ON public.rent_comparables
  FOR ALL TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

-- 4. Rent Reasonableness Analyses
CREATE TABLE public.rent_reasonableness_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  rfta_id UUID NOT NULL,
  proposed_rent NUMERIC(8,2) NOT NULL,
  comparable_avg NUMERIC(8,2),
  comparable_median NUMERIC(8,2),
  comparable_count INTEGER DEFAULT 0,
  determination public.rent_reasonableness_determination NOT NULL DEFAULT 'pending',
  analyst_notes TEXT,
  analyzed_by UUID REFERENCES public.agency_staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, rfta_id)
);
ALTER TABLE public.rent_reasonableness_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can manage analyses" ON public.rent_reasonableness_analyses
  FOR ALL TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

-- 5. Agency Messages
CREATE TABLE public.agency_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'staff',
  recipient_id UUID NOT NULL,
  recipient_type TEXT NOT NULL DEFAULT 'tenant',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  linked_entity_type TEXT,
  linked_entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agency_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view messages" ON public.agency_messages
  FOR SELECT TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff can create messages" ON public.agency_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff can update messages" ON public.agency_messages
  FOR UPDATE TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

-- 6. Agency Automated Reminders
CREATE TABLE public.agency_automated_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  reminder_type public.reminder_type NOT NULL,
  days_before INTEGER NOT NULL DEFAULT 90,
  notice_template_id UUID REFERENCES public.agency_notice_templates(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, reminder_type)
);
ALTER TABLE public.agency_automated_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view reminders" ON public.agency_automated_reminders
  FOR SELECT TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff can manage reminders" ON public.agency_automated_reminders
  FOR ALL TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

-- Triggers for updated_at
CREATE TRIGGER update_landlord_hap_statements_updated_at BEFORE UPDATE ON public.landlord_hap_statements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agency_utility_schedules_updated_at BEFORE UPDATE ON public.agency_utility_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rent_comparables_updated_at BEFORE UPDATE ON public.rent_comparables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rent_reasonableness_analyses_updated_at BEFORE UPDATE ON public.rent_reasonableness_analyses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agency_messages_updated_at BEFORE UPDATE ON public.agency_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agency_automated_reminders_updated_at BEFORE UPDATE ON public.agency_automated_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_landlord_hap_statements_landlord ON public.landlord_hap_statements(landlord_id);
CREATE INDEX idx_landlord_hap_statements_agency ON public.landlord_hap_statements(agency_id);
CREATE INDEX idx_agency_utility_schedules_agency ON public.agency_utility_schedules(agency_id);
CREATE INDEX idx_rent_comparables_agency_rfta ON public.rent_comparables(agency_id, rfta_id);
CREATE INDEX idx_rent_reasonableness_analyses_rfta ON public.rent_reasonableness_analyses(rfta_id);
CREATE INDEX idx_agency_messages_agency ON public.agency_messages(agency_id);
CREATE INDEX idx_agency_messages_recipient ON public.agency_messages(recipient_id);
CREATE INDEX idx_agency_automated_reminders_agency ON public.agency_automated_reminders(agency_id);
