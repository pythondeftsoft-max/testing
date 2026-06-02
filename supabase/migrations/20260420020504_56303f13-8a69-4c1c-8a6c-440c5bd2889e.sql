
CREATE TABLE public.agency_nacha_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL UNIQUE REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  odfi_routing_number TEXT,
  odfi_name TEXT,
  originator_company_name TEXT,
  originator_company_id TEXT,
  originator_account_number TEXT,
  originator_account_type TEXT NOT NULL DEFAULT 'checking',
  immediate_destination TEXT,
  immediate_origin TEXT,
  service_class_code TEXT NOT NULL DEFAULT '220',
  sec_code TEXT NOT NULL DEFAULT 'PPD',
  is_active BOOLEAN NOT NULL DEFAULT false,
  test_mode BOOLEAN NOT NULL DEFAULT true,
  last_file_id_modifier TEXT NOT NULL DEFAULT 'A',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agency_nacha_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  batch_id UUID,
  file_name TEXT NOT NULL,
  file_content TEXT NOT NULL,
  total_entries INTEGER NOT NULL DEFAULT 0,
  total_credit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  effective_entry_date DATE,
  file_id_modifier TEXT,
  generated_by UUID,
  status TEXT NOT NULL DEFAULT 'generated',
  notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_nacha_files_agency ON public.agency_nacha_files(agency_id, created_at DESC);
CREATE INDEX idx_agency_nacha_files_batch ON public.agency_nacha_files(batch_id);

ALTER TABLE public.agency_nacha_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_nacha_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nacha_settings_select" ON public.agency_nacha_settings
FOR SELECT TO authenticated
USING (public.is_agency_staff(auth.uid(), agency_id) OR public.is_admin(auth.uid()));

CREATE POLICY "nacha_settings_insert" ON public.agency_nacha_settings
FOR INSERT TO authenticated
WITH CHECK (public.is_agency_staff(auth.uid(), agency_id) OR public.is_admin(auth.uid()));

CREATE POLICY "nacha_settings_update" ON public.agency_nacha_settings
FOR UPDATE TO authenticated
USING (public.is_agency_staff(auth.uid(), agency_id) OR public.is_admin(auth.uid()))
WITH CHECK (public.is_agency_staff(auth.uid(), agency_id) OR public.is_admin(auth.uid()));

CREATE POLICY "nacha_settings_delete" ON public.agency_nacha_settings
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "nacha_files_select" ON public.agency_nacha_files
FOR SELECT TO authenticated
USING (public.is_agency_staff(auth.uid(), agency_id) OR public.is_admin(auth.uid()));

CREATE POLICY "nacha_files_insert" ON public.agency_nacha_files
FOR INSERT TO authenticated
WITH CHECK (public.is_agency_staff(auth.uid(), agency_id) OR public.is_admin(auth.uid()));

CREATE POLICY "nacha_files_update" ON public.agency_nacha_files
FOR UPDATE TO authenticated
USING (public.is_agency_staff(auth.uid(), agency_id) OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_agency_nacha_settings_updated
BEFORE UPDATE ON public.agency_nacha_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
