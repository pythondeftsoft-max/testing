-- Add unit_id column to property_pushes table
ALTER TABLE public.property_pushes ADD COLUMN unit_id UUID REFERENCES public.property_units(id);

-- Delete existing broken pushes (they have incorrect data structure)
DELETE FROM public.property_pushes WHERE status = 'push_sent';

-- Create index for better query performance on unit_id
CREATE INDEX idx_property_pushes_unit_id ON public.property_pushes(unit_id);

-- Add comment for documentation
COMMENT ON COLUMN public.property_pushes.unit_id IS 'The specific unit being pushed (property_id stores parent property for FK constraint)';