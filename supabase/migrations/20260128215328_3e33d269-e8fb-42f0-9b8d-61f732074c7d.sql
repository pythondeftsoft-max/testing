-- Allow admins to delete any portfolio
CREATE POLICY "Admins can delete portfolios"
  ON portfolios FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_type = 'admin'
    )
  );

-- Allow admins to delete any property
CREATE POLICY "Admins can delete properties"
  ON properties FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_type = 'admin'
    )
  );