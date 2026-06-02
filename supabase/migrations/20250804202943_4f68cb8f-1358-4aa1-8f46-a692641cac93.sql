-- Remove tenant_score column from property_applications table
ALTER TABLE public.property_applications DROP COLUMN IF EXISTS tenant_score;