-- Add sub_stage columns to property_units and profiles tables for sub-stage tracking

-- Add sub_stage to property_units for property pipeline sub-stages
ALTER TABLE property_units 
ADD COLUMN IF NOT EXISTS sub_stage text;

-- Add constraint for valid property sub-stage values
ALTER TABLE property_units 
ADD CONSTRAINT property_units_sub_stage_check 
CHECK (sub_stage IS NULL OR sub_stage IN (
  'push_sent',
  'tenant_responses', 
  'landlord_review',
  'primary_applicant'
));

-- Add sub_stage to profiles for tenant pipeline sub-stages
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS sub_stage text;

-- Add constraint for valid tenant sub-stage values
ALTER TABLE profiles
ADD CONSTRAINT profiles_sub_stage_check 
CHECK (sub_stage IS NULL OR sub_stage IN (
  'properties_received',
  'viewed',
  'accepted'
));

-- Add comments for documentation
COMMENT ON COLUMN property_units.sub_stage IS 'Sub-stage within the pipeline stage (push_sent, tenant_responses, landlord_review, primary_applicant)';
COMMENT ON COLUMN profiles.sub_stage IS 'Sub-stage within the pipeline stage for tenants (properties_received, viewed, accepted)';