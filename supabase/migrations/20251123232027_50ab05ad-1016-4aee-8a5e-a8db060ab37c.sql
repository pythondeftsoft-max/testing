-- Delete all old property_applications records and their dependencies
-- These are legacy records that have been migrated to marketplace_applications
-- Keeping them causes duplicate display issues and broken deny actions

-- First, delete dependent message_limits records
DELETE FROM public.message_limits 
WHERE property_application_id IN (
  SELECT id FROM public.property_applications
);

-- Then delete all property_applications records
DELETE FROM public.property_applications;