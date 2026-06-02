-- Create SECURITY DEFINER function to check if tenant has a push for a property
CREATE OR REPLACE FUNCTION public.tenant_has_push_for_property(property_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM property_pushes pp
    JOIN property_units pu ON pu.id = COALESCE(pp.unit_id, pp.property_id)
    WHERE pu.property_id = tenant_has_push_for_property.property_id
      AND pp.tenant_id = auth.uid()
      AND pp.status IN ('push_sent', 'interested', 'landlord_review', 'primary_applicant')
      AND pp.expires_at > NOW()
  );
$$;

-- Add RLS policy for tenants to view properties they've been pushed to
CREATE POLICY "Tenants can view pushed properties"
ON properties
FOR SELECT
USING (
  tenant_has_push_for_property(id)
  AND deleted_at IS NULL
);