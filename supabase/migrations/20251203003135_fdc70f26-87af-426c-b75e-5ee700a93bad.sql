-- Add SELECT policy for property owners to view appointments by property_id (without requiring maintenance_request_id)
CREATE POLICY "Property owners can view appointments by property"
ON public.maintenance_appointments
FOR SELECT
USING (
  property_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = maintenance_appointments.property_id 
    AND properties.owner_id = auth.uid()
  )
);

-- Add SELECT policy for admins to see all appointments
CREATE POLICY "Admins can view all appointments"
ON public.maintenance_appointments
FOR SELECT
USING (public.is_admin(auth.uid()));