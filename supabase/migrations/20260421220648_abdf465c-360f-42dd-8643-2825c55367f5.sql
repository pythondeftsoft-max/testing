-- 1. Add archived_at column to inspections
ALTER TABLE public.inspections
ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_inspections_archived_at ON public.inspections(archived_at) WHERE archived_at IS NULL;

-- 2. Security definer helper: can a caseworker (auth user) view a given inspection?
CREATE OR REPLACE FUNCTION public.caseworker_can_view_inspection(_user_id uuid, _inspection_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.inspections i
    JOIN public.agency_staff s ON s.agency_id = i.agency_id AND s.user_id = _user_id AND s.is_active = true
    LEFT JOIN public.caseworker_assignments ca
      ON ca.caseworker_id = s.id AND ca.is_active = true
    WHERE i.id = _inspection_id
      AND (
        -- Tenant on this inspection is in caseworker's caseload (via tenant_id on inspection)
        ca.tenant_id = i.tenant_id
        OR
        -- Or the unit is occupied by a tenant in their caseload (via HAP contract on the unit)
        EXISTS (
          SELECT 1 FROM public.agency_hap_contracts hap
          WHERE hap.unit_id = i.unit_id
            AND hap.tenant_id = ca.tenant_id
        )
      )
  );
$$;

-- 3. RLS policy allowing caseworkers to view inspections in their caseload (additive)
DROP POLICY IF EXISTS "Caseworkers can view caseload inspections" ON public.inspections;
CREATE POLICY "Caseworkers can view caseload inspections"
ON public.inspections
FOR SELECT
TO authenticated
USING (public.caseworker_can_view_inspection(auth.uid(), id));