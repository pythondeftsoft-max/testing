-- Fix ai_insights_cache table schema issue
-- Remove NOT NULL constraint from insights column to prevent constraint violations
ALTER TABLE public.ai_insights_cache 
ALTER COLUMN insights DROP NOT NULL;

-- Add a check constraint to ensure at least one of insights or insights_data is populated
ALTER TABLE public.ai_insights_cache 
ADD CONSTRAINT check_insights_data_not_empty 
CHECK (insights IS NOT NULL OR insights_data IS NOT NULL);