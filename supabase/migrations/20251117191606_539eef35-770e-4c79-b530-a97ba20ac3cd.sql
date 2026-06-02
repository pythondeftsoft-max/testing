-- Add country_code column to tenant_profiles
ALTER TABLE tenant_profiles 
ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'US';

-- Add foreign key constraint to countries table
ALTER TABLE tenant_profiles
ADD CONSTRAINT fk_tenant_profiles_country
FOREIGN KEY (country_code) REFERENCES countries(iso_code_2);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_country ON tenant_profiles(country_code);

-- Update existing records to US (if they have a state)
UPDATE tenant_profiles 
SET country_code = 'US' 
WHERE country_code IS NULL AND state IS NOT NULL;

-- Add comment
COMMENT ON COLUMN tenant_profiles.country_code IS 'Two-letter ISO country code (e.g., US, CA, GB)';