-- Add admin policy to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));