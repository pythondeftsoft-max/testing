-- Add RLS policy for admins to insert portfolios
CREATE POLICY "Admins can insert portfolios" 
ON portfolios 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'admin'
  )
);