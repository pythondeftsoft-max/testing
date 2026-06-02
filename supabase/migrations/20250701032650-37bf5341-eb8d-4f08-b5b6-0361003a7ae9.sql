
-- Add desired_rent field to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS desired_rent NUMERIC;

-- Add desired_rent field to viewing_appointments table to track the rent when tenant request is made
ALTER TABLE public.viewing_appointments 
ADD COLUMN IF NOT EXISTS desired_rent NUMERIC;
