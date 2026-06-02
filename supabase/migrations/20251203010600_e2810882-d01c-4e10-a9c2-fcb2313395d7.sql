-- Step 1: Add trigger to auto-populate created_by on INSERT
CREATE OR REPLACE FUNCTION public.set_appointment_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS set_appointment_created_by_trigger ON public.maintenance_appointments;

CREATE TRIGGER set_appointment_created_by_trigger
BEFORE INSERT ON public.maintenance_appointments
FOR EACH ROW EXECUTE FUNCTION public.set_appointment_created_by();

-- Step 2: Drop complex RLS SELECT policies and simplify
DROP POLICY IF EXISTS "Property owners can view appointments for their properties" ON public.maintenance_appointments;
DROP POLICY IF EXISTS "Tenants can view their direct appointments" ON public.maintenance_appointments;
DROP POLICY IF EXISTS "Tenants can view appointments via maintenance requests" ON public.maintenance_appointments;

-- Step 3: Add simplified RLS SELECT policies
CREATE POLICY "Property owners view their appointments" ON public.maintenance_appointments
FOR SELECT USING (
  property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
);

CREATE POLICY "Tenants view their appointments" ON public.maintenance_appointments
FOR SELECT USING (
  tenant_id = auth.uid()
);

CREATE POLICY "Tenants view appointments via maintenance request" ON public.maintenance_appointments
FOR SELECT USING (
  maintenance_request_id IS NOT NULL AND
  maintenance_request_id IN (SELECT id FROM public.maintenance_requests WHERE tenant_id = auth.uid())
);