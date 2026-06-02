-- Create SECURITY DEFINER function to check if tenant has active push
-- This bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.tenant_has_active_push(
  p_unit_id UUID,
  p_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM property_pushes pp
    WHERE pp.unit_id = p_unit_id
      AND pp.tenant_id = p_tenant_id
      AND pp.status IN ('push_sent', 'interested', 'landlord_review', 'primary_applicant')
      AND pp.expires_at > now()
  )
$$;

-- Drop the existing policy that causes recursion
DROP POLICY IF EXISTS "Tenants can view units with active pushes" ON property_units;

-- Create new policy using the security definer function
CREATE POLICY "Tenants can view units with active pushes"
ON property_units FOR SELECT
TO public
USING (
  tenant_has_active_push(id, auth.uid())
);