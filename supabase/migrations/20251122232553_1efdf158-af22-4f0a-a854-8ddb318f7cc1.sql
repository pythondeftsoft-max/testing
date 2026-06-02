-- Add primary_applicant_tenant_id to property_units table
ALTER TABLE property_units 
ADD COLUMN primary_applicant_tenant_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_property_units_primary_applicant ON property_units(primary_applicant_tenant_id);

-- Add comment for documentation
COMMENT ON COLUMN property_units.primary_applicant_tenant_id IS 'The single tenant selected as Primary Applicant for this unit. When set, listing pauses (for landlord units) and full contact info unlocks.';