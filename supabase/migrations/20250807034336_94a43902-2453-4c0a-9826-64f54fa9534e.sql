-- Add missing category column to maintenance_requests table
ALTER TABLE public.maintenance_requests 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Add a comment to describe the column
COMMENT ON COLUMN public.maintenance_requests.category IS 'Category of maintenance request (e.g., plumbing, electrical, hvac, general, etc.)';

-- Create an index on category for better query performance
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_category 
ON public.maintenance_requests(category);