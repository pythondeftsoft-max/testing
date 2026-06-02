-- Update existing tenant profiles to have proper max_rent values and complete data
UPDATE tenant_profiles SET 
  max_rent = CASE 
    WHEN monthly_income IS NOT NULL THEN monthly_income * 0.3
    WHEN rent_range_max IS NOT NULL THEN rent_range_max
    ELSE 1200
  END,
  updated_at = now()
WHERE max_rent IS NULL;

-- Update any tenant profiles that might have incomplete data
UPDATE tenant_profiles SET 
  monthly_income = CASE 
    WHEN monthly_income IS NULL AND rent_range_max IS NOT NULL THEN rent_range_max * 3.5
    WHEN monthly_income IS NULL THEN 3000
    ELSE monthly_income
  END,
  employment_status = COALESCE(employment_status, 'Full-time'),
  city = COALESCE(city, 'Springfield'),
  zip_code = COALESCE(zip_code, '62701'),
  updated_at = now()
WHERE monthly_income IS NULL OR employment_status IS NULL OR city IS NULL;