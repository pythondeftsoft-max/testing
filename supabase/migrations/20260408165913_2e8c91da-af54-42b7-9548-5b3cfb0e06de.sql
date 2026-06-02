
CREATE TABLE public.agency_semap_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  reporting_period TEXT NOT NULL,
  indicator_number INTEGER NOT NULL CHECK (indicator_number BETWEEN 1 AND 14),
  indicator_name TEXT NOT NULL,
  max_points INTEGER NOT NULL DEFAULT 5,
  score INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  entered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id, reporting_period, indicator_number)
);

ALTER TABLE public.agency_semap_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view their agency SEMAP scores"
ON public.agency_semap_scores FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.user_id = auth.uid()
      AND agency_staff.agency_id = agency_semap_scores.agency_id
      AND agency_staff.is_active = true
  )
);

CREATE POLICY "Agency staff can insert SEMAP scores"
ON public.agency_semap_scores FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.user_id = auth.uid()
      AND agency_staff.agency_id = agency_semap_scores.agency_id
      AND agency_staff.is_active = true
      AND agency_staff.role IN ('agency_admin', 'executive_director', 'finance')
  )
);

CREATE POLICY "Agency staff can update SEMAP scores"
ON public.agency_semap_scores FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.user_id = auth.uid()
      AND agency_staff.agency_id = agency_semap_scores.agency_id
      AND agency_staff.is_active = true
      AND agency_staff.role IN ('agency_admin', 'executive_director', 'finance')
  )
);

CREATE TRIGGER update_agency_semap_scores_updated_at
BEFORE UPDATE ON public.agency_semap_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.agency_role_permissions (role_name, tab_name, can_view, can_edit, can_create, can_delete)
VALUES
  ('agency_admin', 'reports', true, true, true, true),
  ('executive_director', 'reports', true, true, true, false),
  ('finance', 'reports', true, true, false, false),
  ('caseworker', 'reports', true, false, false, false),
  ('inspector', 'reports', false, false, false, false),
  ('viewer', 'reports', true, false, false, false),
  ('intake_clerk', 'reports', false, false, false, false),
  ('porting_coordinator', 'reports', false, false, false, false)
ON CONFLICT (role_name, tab_name) DO NOTHING;
