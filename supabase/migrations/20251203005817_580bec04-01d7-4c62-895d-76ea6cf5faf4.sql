-- Add tenant_id column to maintenance_appointments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_appointments' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.maintenance_appointments 
    ADD COLUMN tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_maintenance_appointments_tenant_id 
    ON public.maintenance_appointments(tenant_id);
  END IF;
END $$;

-- Drop existing SELECT policies to recreate them properly
DROP POLICY IF EXISTS "Property owners can view appointments by property" ON public.maintenance_appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.maintenance_appointments;
DROP POLICY IF EXISTS "Tenants can view their appointments" ON public.maintenance_appointments;
DROP POLICY IF EXISTS "Tenants can view appointments for their maintenance requests" ON public.maintenance_appointments;

-- Create comprehensive SELECT policies

-- Admins can view ALL appointments
CREATE POLICY "Admins can view all appointments"
ON public.maintenance_appointments
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Property owners can view appointments for their properties
CREATE POLICY "Property owners can view appointments for their properties"
ON public.maintenance_appointments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = maintenance_appointments.property_id
    AND p.owner_id = auth.uid()
  )
);

-- Tenants can view appointments where they are the tenant_id
CREATE POLICY "Tenants can view their direct appointments"
ON public.maintenance_appointments
FOR SELECT
USING (tenant_id = auth.uid());

-- Tenants can view appointments linked to their maintenance requests
CREATE POLICY "Tenants can view appointments via maintenance requests"
ON public.maintenance_appointments
FOR SELECT
USING (
  maintenance_request_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.maintenance_requests mr
    WHERE mr.id = maintenance_appointments.maintenance_request_id
    AND mr.tenant_id = auth.uid()
  )
);