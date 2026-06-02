-- Backfill legacy users with NULL values so they can access their accounts

-- Backfill missing monthly_income with 0 (the most common issue affecting 32 users)
UPDATE tenant_profiles 
SET monthly_income = 0
WHERE monthly_income IS NULL;

-- Backfill voucher_status with 'no' (valid option per constraint)
UPDATE tenant_profiles 
SET voucher_status = 'no'
WHERE voucher_status IS NULL OR voucher_status = '' OR LOWER(voucher_status) = 'n/a';

-- Backfill move_in_window with 'asap' (valid option per constraint)
UPDATE tenant_profiles 
SET move_in_window = 'asap'
WHERE move_in_window IS NULL OR move_in_window = '' OR LOWER(move_in_window) = 'n/a';

-- Backfill credit_score_range with 'not-specified' (valid option per constraint)
UPDATE tenant_profiles 
SET credit_score_range = 'not-specified'
WHERE credit_score_range IS NULL OR credit_score_range = '' OR LOWER(credit_score_range) = 'n/a';

-- Backfill employment_status with 'unemployed' as fallback
UPDATE tenant_profiles 
SET employment_status = 'unemployed'
WHERE employment_status IS NULL OR employment_status = '' OR LOWER(employment_status) = 'n/a';

-- Backfill housing_authority with 'Not specified'
UPDATE tenant_profiles 
SET housing_authority = 'Not specified'
WHERE housing_authority IS NULL OR housing_authority = '' OR LOWER(housing_authority) = 'n/a';

-- Backfill boolean fields with false as default (safe assumption)
UPDATE tenant_profiles 
SET has_eviction = false
WHERE has_eviction IS NULL;

UPDATE tenant_profiles 
SET has_pets = false
WHERE has_pets IS NULL;

UPDATE tenant_profiles 
SET has_felonies = false
WHERE has_felonies IS NULL;

UPDATE tenant_profiles 
SET has_accessibility_needs = false
WHERE has_accessibility_needs IS NULL;

-- Backfill rent range with defaults
UPDATE tenant_profiles 
SET rent_range_min = 0
WHERE rent_range_min IS NULL;

UPDATE tenant_profiles 
SET rent_range_max = 5000
WHERE rent_range_max IS NULL;

-- Backfill bedrooms_approved with empty array if null
UPDATE tenant_profiles 
SET bedrooms_approved = '{}'::text[]
WHERE bedrooms_approved IS NULL;