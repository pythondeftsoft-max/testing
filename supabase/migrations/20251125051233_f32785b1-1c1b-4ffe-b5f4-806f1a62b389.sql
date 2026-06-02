-- Make first_month_rent nullable since it's optional reference data
ALTER TABLE landlord_placement_fees 
ALTER COLUMN first_month_rent DROP NOT NULL;

-- Add security_deposit column as nullable
ALTER TABLE landlord_placement_fees 
ADD COLUMN IF NOT EXISTS security_deposit NUMERIC;

-- Add helpful comments
COMMENT ON COLUMN landlord_placement_fees.first_month_rent IS 'Optional: First month rent amount (for reference only, not part of placement fee calculation)';
COMMENT ON COLUMN landlord_placement_fees.security_deposit IS 'Optional: Security deposit amount (for reference only, not part of placement fee calculation)';