-- Add fallback RLS INSERT policies for maintenance_appointments

-- Fallback admin policy checking profiles.user_type directly
CREATE POLICY "Admin users can create appointments (fallback)"
ON public.maintenance_appointments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Simplified property owner policy
CREATE POLICY "Property owners can insert appointments (simplified)"
ON public.maintenance_appointments
FOR INSERT
WITH CHECK (
  property_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = property_id
    AND properties.owner_id = auth.uid()
  )
);