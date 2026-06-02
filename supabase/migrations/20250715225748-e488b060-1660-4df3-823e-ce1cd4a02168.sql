-- Allow anyone (including unauthenticated users) to browse available properties
DROP POLICY IF EXISTS "Authenticated users can browse available properties" ON public.properties;

-- Create new policy that allows both authenticated and anonymous users to view available properties
CREATE POLICY "Anyone can browse available properties" 
ON public.properties 
FOR SELECT 
USING (status = 'available' AND deleted_at IS NULL);