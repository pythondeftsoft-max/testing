-- Add permissive INSERT policy - any authenticated user can create appointments
CREATE POLICY "Authenticated users can create appointments"
ON public.maintenance_appointments
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);