-- Allow admins to view all lease renewals
CREATE POLICY "Admins can view all lease renewals"
ON lease_renewals
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);