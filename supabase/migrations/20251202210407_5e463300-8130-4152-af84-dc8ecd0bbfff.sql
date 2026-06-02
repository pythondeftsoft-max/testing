-- Allow property owners to create maintenance requests for their properties
CREATE POLICY "Property owners can create maintenance requests for their properties"
ON maintenance_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = maintenance_requests.property_id
    AND properties.owner_id = auth.uid()
  )
);

-- Allow admins to create maintenance requests
CREATE POLICY "Admins can create maintenance requests"
ON maintenance_requests
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));