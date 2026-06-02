
-- Add individual_units column to store multi-unit property data
ALTER TABLE public.properties 
ADD COLUMN individual_units jsonb DEFAULT '[]'::jsonb;

-- Add comment to document the individual_units column
COMMENT ON COLUMN public.properties.individual_units IS 'Array of individual unit data for multi-unit properties (stored as JSONB)';
