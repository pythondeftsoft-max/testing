-- 1. Add 'requested' to inspection_status enum (must be in own statement, committed before use)
ALTER TYPE public.inspection_status ADD VALUE IF NOT EXISTS 'requested';

-- 2. Add intake + decline + assignment-mode columns to inspections
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS requested_by uuid,
  ADD COLUMN IF NOT EXISTS requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS request_reason text,
  ADD COLUMN IF NOT EXISTS preferred_date_start date,
  ADD COLUMN IF NOT EXISTS preferred_date_end date,
  ADD COLUMN IF NOT EXISTS urgency text,
  ADD COLUMN IF NOT EXISTS declined_by uuid,
  ADD COLUMN IF NOT EXISTS decline_reason text,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS assignment_mode text;

-- 3. Partial index for fast unassigned/requested queue loads
CREATE INDEX IF NOT EXISTS idx_inspections_unassigned_queue
  ON public.inspections (agency_id, requested_at)
  WHERE inspector_id IS NULL;

-- 4. New agency_operational_settings table
CREATE TABLE IF NOT EXISTS public.agency_operational_settings (
  agency_id uuid PRIMARY KEY REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  inspection_auto_assign boolean NOT NULL DEFAULT false,
  inspection_assignment_strategy text NOT NULL DEFAULT 'territory_workload_roundrobin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_operational_settings ENABLE ROW LEVEL SECURITY;

-- 5. RLS: any agency staff can view; only admin/ED/inspection_supervisor can change
CREATE POLICY "Agency staff can view operational settings"
  ON public.agency_operational_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff s
      WHERE s.agency_id = agency_operational_settings.agency_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
    )
  );

CREATE POLICY "Supervisors and admins can insert operational settings"
  ON public.agency_operational_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_staff s
      WHERE s.agency_id = agency_operational_settings.agency_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
        AND s.role::text IN ('agency_admin', 'executive_director', 'inspection_supervisor')
    )
  );

CREATE POLICY "Supervisors and admins can update operational settings"
  ON public.agency_operational_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff s
      WHERE s.agency_id = agency_operational_settings.agency_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
        AND s.role::text IN ('agency_admin', 'executive_director', 'inspection_supervisor')
    )
  );

-- 6. Auto-update timestamp trigger
CREATE TRIGGER update_agency_operational_settings_updated_at
  BEFORE UPDATE ON public.agency_operational_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();