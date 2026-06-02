-- Drop the overly restrictive INSERT policy
DROP POLICY IF EXISTS "Tenants can only create maintenance requests for their approved" ON maintenance_requests;

-- Create a more flexible policy that checks both application approval AND unit assignment
CREATE POLICY "Tenants can create requests for assigned properties"
ON maintenance_requests
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = auth.uid() AND (
    -- Has approved application for the property
    EXISTS (
      SELECT 1 FROM property_applications pa
      WHERE pa.property_id = maintenance_requests.property_id
        AND pa.tenant_id = auth.uid()
        AND pa.status = 'approved'
    )
    OR
    -- Is directly assigned to a unit in the property
    EXISTS (
      SELECT 1 FROM property_units pu
      WHERE pu.property_id = maintenance_requests.property_id
        AND pu.tenant_id = auth.uid()
    )
  )
);