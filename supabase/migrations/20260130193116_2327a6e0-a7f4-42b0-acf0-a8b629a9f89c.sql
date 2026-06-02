-- Allow tenants to view units they have been pushed
-- This fixes the issue where tenants can't see pushed properties in "My Matches"
-- because the unit has no assigned tenant yet (tenant_id IS NULL)

CREATE POLICY "Tenants can view units with active pushes"
ON property_units
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM property_pushes pp
    WHERE pp.unit_id = property_units.id
    AND pp.tenant_id = auth.uid()
    AND pp.status IN ('push_sent', 'interested', 'landlord_review', 'primary_applicant')
    AND pp.expires_at > now()
  )
);