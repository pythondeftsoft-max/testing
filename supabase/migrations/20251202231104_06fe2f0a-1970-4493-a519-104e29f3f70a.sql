-- Add property_id and unit_id columns to maintenance_appointments
ALTER TABLE public.maintenance_appointments 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.property_units(id) ON DELETE SET NULL;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_maintenance_appointments_property_id ON public.maintenance_appointments(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_appointments_unit_id ON public.maintenance_appointments(unit_id);