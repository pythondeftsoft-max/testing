-- Allow admins full access to manage all property units
CREATE POLICY "Admins can manage all units"
ON property_units
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);