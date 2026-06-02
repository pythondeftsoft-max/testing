-- Add missing application_data column to property_applications table
-- This column stores additional application metadata like tenant_type, invitation details, etc.
ALTER TABLE property_applications 
ADD COLUMN IF NOT EXISTS application_data JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN property_applications.application_data IS 'Stores additional application metadata like tenant_type, invitation details, etc.';