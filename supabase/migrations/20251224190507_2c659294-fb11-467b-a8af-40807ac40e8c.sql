-- Allow tenants to update their own property push status (respond to matches)
CREATE POLICY "Tenants can update their own pushes"
ON property_pushes
FOR UPDATE
TO authenticated
USING (tenant_id = auth.uid())
WITH CHECK (tenant_id = auth.uid());