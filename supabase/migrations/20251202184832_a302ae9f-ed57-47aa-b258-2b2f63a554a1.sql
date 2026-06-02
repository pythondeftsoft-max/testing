-- Add RLS policy for admins to view all maintenance requests
CREATE POLICY "Admins can view all maintenance requests"
  ON maintenance_requests
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));