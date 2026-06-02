-- Standardize maintenance request categories to match frontend expectations
UPDATE maintenance_requests 
SET category = CASE 
  WHEN LOWER(category) = 'plumbing' THEN 'plumbing'
  WHEN LOWER(category) = 'electrical' THEN 'electrical' 
  WHEN LOWER(category) = 'hvac' THEN 'hvac'
  WHEN LOWER(category) = 'appliance_repair' OR LOWER(category) = 'appliance repair' THEN 'appliance_repair'
  WHEN LOWER(category) = 'flooring' THEN 'flooring'
  WHEN LOWER(category) = 'painting' THEN 'painting'
  WHEN LOWER(category) = 'roofing' THEN 'roofing'
  WHEN LOWER(category) = 'landscaping' THEN 'landscaping'
  WHEN LOWER(category) = 'cleaning' THEN 'cleaning'
  WHEN LOWER(category) = 'pest_control' OR LOWER(category) = 'pest control' THEN 'pest_control'
  WHEN LOWER(category) = 'security_systems' OR LOWER(category) = 'security systems' THEN 'security_systems'
  ELSE 'other'
END
WHERE category IS NOT NULL;

-- Ensure all maintenance requests have valid categories
UPDATE maintenance_requests 
SET category = 'other' 
WHERE category IS NULL OR category = '';

-- Update any existing maintenance vendors to ensure consistent naming
-- This helps with the assignee filter matching
UPDATE maintenance_vendors 
SET name = TRIM(name)
WHERE name != TRIM(name);