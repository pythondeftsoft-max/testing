CREATE POLICY "Admins can update portfolios"
ON portfolios FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.user_type = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.user_type = 'admin'
));