-- Add state column to tenant_profiles
ALTER TABLE tenant_profiles 
ADD COLUMN IF NOT EXISTS state text;

-- Add index for faster queries on state
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_state ON tenant_profiles(state);

-- Add comment for documentation
COMMENT ON COLUMN tenant_profiles.state IS 'Two-letter state code (e.g., MO, NY, CA) for tenant location';