
-- Phase 2A: Recertification Workflow Engine columns
ALTER TABLE public.agency_recertifications
  ADD COLUMN IF NOT EXISTS workflow_step TEXT NOT NULL DEFAULT 'initiated',
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS workflow_history JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX idx_recerts_workflow_step ON public.agency_recertifications(workflow_step);

-- Phase 2C: Multi-Office / Regional Hierarchy
CREATE TABLE public.agency_offices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  region TEXT,
  address TEXT,
  parent_office_id UUID REFERENCES public.agency_offices(id),
  manager_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_offices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view their offices"
  ON public.agency_offices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.user_id = auth.uid()
        AND agency_staff.agency_id = agency_offices.agency_id
        AND agency_staff.is_active = true
    )
  );

CREATE POLICY "Agency admins can manage offices"
  ON public.agency_offices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.user_id = auth.uid()
        AND agency_staff.agency_id = agency_offices.agency_id
        AND agency_staff.role = 'agency_admin'
        AND agency_staff.is_active = true
    )
  );

-- Add office_id to agency_staff
ALTER TABLE public.agency_staff
  ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES public.agency_offices(id);
