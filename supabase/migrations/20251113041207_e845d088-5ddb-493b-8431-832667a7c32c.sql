-- Fix missing CASCADE constraints on appointments and property_tenant_requests tables
-- This allows properties and units to be deleted even when they have related appointments or tenant requests

-- Fix appointments.property_id
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_property_id_fkey;

ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_property_id_fkey 
FOREIGN KEY (property_id) 
REFERENCES public.properties(id) 
ON DELETE CASCADE;

-- Fix appointments.unit_id
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_unit_id_fkey;

ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_unit_id_fkey 
FOREIGN KEY (unit_id) 
REFERENCES public.property_units(id) 
ON DELETE CASCADE;

-- Fix property_tenant_requests.unit_id
ALTER TABLE public.property_tenant_requests 
DROP CONSTRAINT IF EXISTS property_tenant_requests_unit_id_fkey;

ALTER TABLE public.property_tenant_requests 
ADD CONSTRAINT property_tenant_requests_unit_id_fkey 
FOREIGN KEY (unit_id) 
REFERENCES public.property_units(id) 
ON DELETE CASCADE;

-- Add comments explaining the cascade behavior
COMMENT ON CONSTRAINT appointments_property_id_fkey ON public.appointments IS 
'Cascade deletes appointment records when parent property is deleted';

COMMENT ON CONSTRAINT appointments_unit_id_fkey ON public.appointments IS 
'Cascade deletes appointment records when parent unit is deleted';

COMMENT ON CONSTRAINT property_tenant_requests_unit_id_fkey ON public.property_tenant_requests IS 
'Cascade deletes tenant request records when parent unit is deleted';