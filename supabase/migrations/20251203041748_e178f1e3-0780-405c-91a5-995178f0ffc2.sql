-- Add RLS policy for admins to view all rent splits
CREATE POLICY "Admins can view all rent splits"
ON public.rent_splits
FOR SELECT
TO public
USING (public.is_admin(auth.uid()));