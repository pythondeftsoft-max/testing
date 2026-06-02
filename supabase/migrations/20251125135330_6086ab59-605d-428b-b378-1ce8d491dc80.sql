-- Add country_code column to tenant_applications table
ALTER TABLE tenant_applications 
ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'US';

-- Add comment for documentation
COMMENT ON COLUMN tenant_applications.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., US, CA, GB, MX)';

-- Add comment for territories country column for future reference
COMMENT ON COLUMN territories.country IS 'ISO 3166-1 alpha-2 country code (e.g., US, CA, GB, MX) - must match country_code in tenant_applications and tenant_profiles';