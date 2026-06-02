-- Create admin policy for tenant profiles
CREATE POLICY "Admins can view all tenant profiles"
ON public.tenant_profiles
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));