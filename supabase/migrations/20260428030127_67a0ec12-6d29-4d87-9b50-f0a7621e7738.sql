-- Per-staff permission overrides (additive over agency_role_permissions defaults)
CREATE TABLE IF NOT EXISTS public.agency_staff_permission_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL,
  staff_id uuid NOT NULL REFERENCES public.agency_staff(id) ON DELETE CASCADE,
  tab_name text NOT NULL,
  can_view boolean,
  can_edit boolean,
  can_create boolean,
  can_delete boolean,
  reason text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agency_staff_permission_overrides_unique UNIQUE (staff_id, tab_name)
);

CREATE INDEX IF NOT EXISTS idx_aspo_agency ON public.agency_staff_permission_overrides(agency_id);
CREATE INDEX IF NOT EXISTS idx_aspo_staff  ON public.agency_staff_permission_overrides(staff_id);

ALTER TABLE public.agency_staff_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Only agency_admin of same agency (or platform admin) may read/write overrides
CREATE POLICY "Admins read agency overrides"
ON public.agency_staff_permission_overrides
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid()
      AND s.agency_id = agency_staff_permission_overrides.agency_id
      AND s.role = 'agency_admin'
      AND s.is_active = true
  )
);

CREATE POLICY "Admins insert agency overrides"
ON public.agency_staff_permission_overrides
FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid()
      AND s.agency_id = agency_staff_permission_overrides.agency_id
      AND s.role = 'agency_admin'
      AND s.is_active = true
  )
);

CREATE POLICY "Admins update agency overrides"
ON public.agency_staff_permission_overrides
FOR UPDATE
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid()
      AND s.agency_id = agency_staff_permission_overrides.agency_id
      AND s.role = 'agency_admin'
      AND s.is_active = true
  )
);

CREATE POLICY "Admins delete agency overrides"
ON public.agency_staff_permission_overrides
FOR DELETE
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid()
      AND s.agency_id = agency_staff_permission_overrides.agency_id
      AND s.role = 'agency_admin'
      AND s.is_active = true
  )
);

CREATE TRIGGER trg_aspo_updated_at
BEFORE UPDATE ON public.agency_staff_permission_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Resolver: merges role default with override (override wins when non-null)
CREATE OR REPLACE FUNCTION public.resolve_staff_permission(_staff_id uuid, _tab text)
RETURNS TABLE(can_view boolean, can_edit boolean, can_create boolean, can_delete boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH s AS (
    SELECT role::text AS role_name FROM public.agency_staff WHERE id = _staff_id
  ),
  d AS (
    SELECT can_view, can_edit, can_create, can_delete
    FROM public.agency_role_permissions
    WHERE role_name = (SELECT role_name FROM s) AND tab_name = _tab
  ),
  o AS (
    SELECT can_view, can_edit, can_create, can_delete
    FROM public.agency_staff_permission_overrides
    WHERE staff_id = _staff_id AND tab_name = _tab
  )
  SELECT
    COALESCE((SELECT can_view   FROM o), (SELECT can_view   FROM d), false),
    COALESCE((SELECT can_edit   FROM o), (SELECT can_edit   FROM d), false),
    COALESCE((SELECT can_create FROM o), (SELECT can_create FROM d), false),
    COALESCE((SELECT can_delete FROM o), (SELECT can_delete FROM d), false);
$$;