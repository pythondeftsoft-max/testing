-- Allow landlords to view pushes for units on their properties
CREATE POLICY "Landlords can view pushes for their units" 
ON property_pushes 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM property_units pu
    JOIN properties p ON pu.property_id = p.id
    WHERE pu.id = property_pushes.unit_id
    AND p.owner_id = auth.uid()
  )
);

-- Allow landlords to update (deny/approve) pushes for their units
CREATE POLICY "Landlords can update pushes for their units"
ON property_pushes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM property_units pu
    JOIN properties p ON pu.property_id = p.id
    WHERE pu.id = property_pushes.unit_id
    AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM property_units pu
    JOIN properties p ON pu.property_id = p.id
    WHERE pu.id = property_pushes.unit_id
    AND p.owner_id = auth.uid()
  )
);