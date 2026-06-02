-- Add admin policy to view all property applications
CREATE POLICY "Admins can view all property applications"
ON public.property_applications
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));