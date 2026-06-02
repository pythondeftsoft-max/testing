-- Add profile_snapshot column to store tenant profile data at application time
ALTER TABLE marketplace_applications 
ADD COLUMN profile_snapshot JSONB;

-- Add comment for documentation
COMMENT ON COLUMN marketplace_applications.profile_snapshot IS 
'Snapshot of complete tenant profile data at the time of application submission. Includes contact info, employment, income, Section 8 voucher details, pets, and references.';

-- Create an index for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_marketplace_applications_profile_snapshot 
ON marketplace_applications USING gin (profile_snapshot);