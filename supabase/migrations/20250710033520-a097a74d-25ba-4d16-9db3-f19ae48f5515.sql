-- Add admin policy to view all properties regardless of status
CREATE POLICY "Admins can view all properties"
ON public.properties
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));