-- EIV import batches
CREATE TABLE public.agency_eiv_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  period_label TEXT,
  tax_year INTEGER,
  quarter INTEGER,
  row_count INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  discrepancy_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  uploaded_by UUID,
  notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eiv_imports_agency ON public.agency_eiv_imports(agency_id, created_at DESC);

ALTER TABLE public.agency_eiv_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff manage own eiv imports"
ON public.agency_eiv_imports FOR ALL
TO authenticated
USING (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid()
      AND s.agency_id = agency_eiv_imports.agency_id
      AND s.is_active = true
  )
)
WITH CHECK (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid()
      AND s.agency_id = agency_eiv_imports.agency_id
      AND s.is_active = true
  )
);

-- EIV raw records
CREATE TABLE public.agency_eiv_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  import_id UUID REFERENCES public.agency_eiv_imports(id) ON DELETE CASCADE,
  tenant_ssn_last_four TEXT,
  tenant_first_name TEXT,
  tenant_last_name TEXT,
  reported_employer TEXT,
  reported_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  income_source TEXT,
  period_label TEXT,
  matched_tenant_id UUID,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eiv_records_agency ON public.agency_eiv_records(agency_id);
CREATE INDEX idx_eiv_records_import ON public.agency_eiv_records(import_id);
CREATE INDEX idx_eiv_records_tenant ON public.agency_eiv_records(matched_tenant_id);

ALTER TABLE public.agency_eiv_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff manage own eiv records"
ON public.agency_eiv_records FOR ALL
TO authenticated
USING (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid()
      AND s.agency_id = agency_eiv_records.agency_id
      AND s.is_active = true
  )
)
WITH CHECK (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid()
      AND s.agency_id = agency_eiv_records.agency_id
      AND s.is_active = true
  )
);

-- EIV discrepancies
CREATE TABLE public.agency_eiv_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  eiv_record_id UUID REFERENCES public.agency_eiv_records(id) ON DELETE CASCADE,
  import_id UUID REFERENCES public.agency_eiv_imports(id) ON DELETE CASCADE,
  tenant_id UUID,
  tenant_display_name TEXT,
  declared_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  eiv_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  variance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  variance_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_caseworker_id UUID,
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eiv_disc_agency_status ON public.agency_eiv_discrepancies(agency_id, status);
CREATE INDEX idx_eiv_disc_caseworker ON public.agency_eiv_discrepancies(assigned_caseworker_id);

ALTER TABLE public.agency_eiv_discrepancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff manage own eiv discrepancies"
ON public.agency_eiv_discrepancies FOR ALL
TO authenticated
USING (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid()
      AND s.agency_id = agency_eiv_discrepancies.agency_id
      AND s.is_active = true
  )
)
WITH CHECK (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid()
      AND s.agency_id = agency_eiv_discrepancies.agency_id
      AND s.is_active = true
  )
);

-- Internal renewal notes (annotation only — never modifies lease_renewals)
CREATE TABLE public.agency_renewal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  renewal_id UUID,
  property_id UUID,
  tenant_id UUID,
  note TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_by UUID,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_renewal_notes_agency ON public.agency_renewal_notes(agency_id);
CREATE INDEX idx_renewal_notes_renewal ON public.agency_renewal_notes(renewal_id);

ALTER TABLE public.agency_renewal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff manage own renewal notes"
ON public.agency_renewal_notes FOR ALL
TO authenticated
USING (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid()
      AND s.agency_id = agency_renewal_notes.agency_id
      AND s.is_active = true
  )
)
WITH CHECK (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid()
      AND s.agency_id = agency_renewal_notes.agency_id
      AND s.is_active = true
  )
);

-- Auto-update timestamps
CREATE TRIGGER trg_eiv_imports_updated
BEFORE UPDATE ON public.agency_eiv_imports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_eiv_discrepancies_updated
BEFORE UPDATE ON public.agency_eiv_discrepancies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_renewal_notes_updated
BEFORE UPDATE ON public.agency_renewal_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();