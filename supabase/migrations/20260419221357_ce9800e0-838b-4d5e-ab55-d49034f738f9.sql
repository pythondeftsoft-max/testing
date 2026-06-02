-- ============================================================
-- Session 4: HQS/NSPIRE Inspections — Augment existing schema
-- ============================================================

-- 1. Extend inspections table with HAP/tenant linkage + lifecycle fields
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS hap_contract_id uuid REFERENCES public.agency_hap_contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inspection_type text NOT NULL DEFAULT 'annual',
  ADD COLUMN IF NOT EXISTS overall_score integer,
  ADD COLUMN IF NOT EXISTS next_inspection_due date,
  ADD COLUMN IF NOT EXISTS abatement_triggered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS abatement_cleared_at timestamptz;

-- Type guard via trigger (since no enum extension available without dropping)
CREATE OR REPLACE FUNCTION public.validate_inspection_type()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.inspection_type NOT IN ('initial','annual','special','reinspection','quality_control','move_in','move_out') THEN
    RAISE EXCEPTION 'Invalid inspection_type: %', NEW.inspection_type;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_inspection_type ON public.inspections;
CREATE TRIGGER trg_validate_inspection_type
  BEFORE INSERT OR UPDATE OF inspection_type ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.validate_inspection_type();

CREATE INDEX IF NOT EXISTS idx_inspections_tenant ON public.inspections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inspections_hap ON public.inspections(hap_contract_id);
CREATE INDEX IF NOT EXISTS idx_inspections_next_due ON public.inspections(next_inspection_due) WHERE next_inspection_due IS NOT NULL;

-- 2. Deficiencies table — granular NSPIRE-style findings with cure deadlines
CREATE TABLE IF NOT EXISTS public.agency_inspection_deficiencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'standard' CHECK (severity IN ('life_threatening','severe','moderate','standard')),
  nspire_code text,
  location text,
  description text NOT NULL,
  photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  cure_deadline timestamptz,
  cured_date timestamptz,
  cured_by uuid,
  cure_verified_by uuid,
  cure_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deficiencies_inspection ON public.agency_inspection_deficiencies(inspection_id);
CREATE INDEX IF NOT EXISTS idx_deficiencies_agency ON public.agency_inspection_deficiencies(agency_id);
CREATE INDEX IF NOT EXISTS idx_deficiencies_open ON public.agency_inspection_deficiencies(cure_deadline) WHERE cured_date IS NULL;

ALTER TABLE public.agency_inspection_deficiencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff manage deficiencies"
  ON public.agency_inspection_deficiencies
  FOR ALL
  USING (public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE TRIGGER trg_deficiencies_updated_at
  BEFORE UPDATE ON public.agency_inspection_deficiencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-set cure deadline based on severity when row is created
CREATE OR REPLACE FUNCTION public.set_deficiency_cure_deadline()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.cure_deadline IS NULL THEN
    NEW.cure_deadline := CASE NEW.severity
      WHEN 'life_threatening' THEN now() + interval '24 hours'
      WHEN 'severe' THEN now() + interval '72 hours'
      WHEN 'moderate' THEN now() + interval '14 days'
      ELSE now() + interval '30 days'
    END;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_cure_deadline ON public.agency_inspection_deficiencies;
CREATE TRIGGER trg_set_cure_deadline
  BEFORE INSERT ON public.agency_inspection_deficiencies
  FOR EACH ROW EXECUTE FUNCTION public.set_deficiency_cure_deadline();

-- 3. Auto-schedule rules table
CREATE TABLE IF NOT EXISTS public.agency_inspection_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  inspection_type text NOT NULL DEFAULT 'annual',
  cycle_months integer NOT NULL DEFAULT 12,
  schedule_days_before integer NOT NULL DEFAULT 30,
  notify_landlord_days_before integer NOT NULL DEFAULT 14,
  notify_tenant_days_before integer NOT NULL DEFAULT 7,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_inspection_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff manage schedules"
  ON public.agency_inspection_schedules
  FOR ALL
  USING (public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE TRIGGER trg_inspection_schedules_updated_at
  BEFORE UPDATE ON public.agency_inspection_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. When inspection result becomes 'fail', flag HAP contract & set abatement
CREATE OR REPLACE FUNCTION public.handle_inspection_result_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.result = 'fail' AND (OLD.result IS DISTINCT FROM 'fail') AND NEW.hap_contract_id IS NOT NULL THEN
    UPDATE public.agency_hap_contracts
       SET status = 'abatement_risk', updated_at = now()
     WHERE id = NEW.hap_contract_id
       AND status NOT IN ('terminated','expired');
    NEW.abatement_triggered := true;
  ELSIF NEW.result = 'pass' AND OLD.result = 'fail' AND NEW.hap_contract_id IS NOT NULL THEN
    UPDATE public.agency_hap_contracts
       SET status = 'active', updated_at = now()
     WHERE id = NEW.hap_contract_id
       AND status = 'abatement_risk';
    NEW.abatement_cleared_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_inspection_result_change ON public.inspections;
CREATE TRIGGER trg_inspection_result_change
  BEFORE UPDATE OF result ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.handle_inspection_result_change();

-- 5. Allow tenant to view their own inspections (read-only)
DROP POLICY IF EXISTS "Tenants view their inspections" ON public.inspections;
CREATE POLICY "Tenants view their inspections"
  ON public.inspections
  FOR SELECT
  USING (tenant_id = auth.uid());