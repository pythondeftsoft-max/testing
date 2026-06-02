-- Add RLS policy for tenants to view properties they are housed in
CREATE POLICY "Tenants can view their housed properties"
ON properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tenant_properties
    WHERE tenant_properties.property_id = properties.id
    AND tenant_properties.tenant_id = auth.uid()
    AND tenant_properties.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM lease_lifecycle_tracking
    WHERE lease_lifecycle_tracking.property_id = properties.id
    AND lease_lifecycle_tracking.tenant_id = auth.uid()
    AND lease_lifecycle_tracking.lease_status = 'active'
  )
);