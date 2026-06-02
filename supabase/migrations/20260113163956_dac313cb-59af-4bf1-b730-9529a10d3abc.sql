-- Add submitted_at column to property_applications if it doesn't exist
ALTER TABLE public.property_applications 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

-- Update any NULL values to use created_at
UPDATE public.property_applications 
SET submitted_at = created_at 
WHERE submitted_at IS NULL;