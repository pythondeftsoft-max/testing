
-- Add units column to properties table to support multi-unit property data
ALTER TABLE public.properties 
ADD COLUMN units JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.properties.units IS 'Array of unit objects for multi-unit properties with id, name, bedrooms, bathrooms, squareFeet, and monthlyRent';
