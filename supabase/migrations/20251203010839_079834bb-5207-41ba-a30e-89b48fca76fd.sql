-- Add policy for tenants to view appointments for their housed property/unit
CREATE POLICY "Tenants view appointments via housed unit" ON public.maintenance_appointments
FOR SELECT USING (
  property_id IN (
    SELECT property_id FROM public.property_units 
    WHERE tenant_id = auth.uid() AND status = 'occupied'
  )
  OR
  unit_id IN (
    SELECT id FROM public.property_units 
    WHERE tenant_id = auth.uid() AND status = 'occupied'
  )
);