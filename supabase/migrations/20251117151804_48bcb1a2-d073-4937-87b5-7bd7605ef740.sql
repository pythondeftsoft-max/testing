-- Add territory_id and pipeline_stage to profiles table
ALTER TABLE profiles 
ADD COLUMN territory_id UUID REFERENCES territories(id) ON DELETE SET NULL,
ADD COLUMN pipeline_stage TEXT;

-- Add indexes for profiles
CREATE INDEX idx_profiles_territory_id ON profiles(territory_id);
CREATE INDEX idx_profiles_pipeline_stage ON profiles(pipeline_stage);

-- Add comments for profiles
COMMENT ON COLUMN profiles.territory_id IS 'Links tenant to their geographic territory for auto-assignment';
COMMENT ON COLUMN profiles.pipeline_stage IS 'Current stage in tenant workflow: seeking, applied, approved, housed';

-- Add territory_id to properties table
ALTER TABLE properties 
ADD COLUMN territory_id UUID REFERENCES territories(id) ON DELETE SET NULL;

-- Add index for properties
CREATE INDEX idx_properties_territory_id ON properties(territory_id);

-- Add comment for properties
COMMENT ON COLUMN properties.territory_id IS 'Links property to geographic territory for auto-assignment';

-- Add territory_id and pipeline_stage to property_units table
ALTER TABLE property_units 
ADD COLUMN territory_id UUID REFERENCES territories(id) ON DELETE SET NULL,
ADD COLUMN pipeline_stage TEXT;

-- Add indexes for property_units
CREATE INDEX idx_property_units_territory_id ON property_units(territory_id);
CREATE INDEX idx_property_units_pipeline_stage ON property_units(pipeline_stage);

-- Add comments for property_units
COMMENT ON COLUMN property_units.territory_id IS 'Links unit to geographic territory, inherited from parent property or set independently';
COMMENT ON COLUMN property_units.pipeline_stage IS 'Current stage in unit workflow: available, matched, filled_awaiting_payment, paid';