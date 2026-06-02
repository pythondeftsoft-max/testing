-- First, let's update some existing properties to 'occupied' status and add lease dates
UPDATE properties 
SET status = 'occupied',
    lease_start_date = '2024-01-01',
    lease_end_date = '2024-12-31'
WHERE id IN (
  SELECT id FROM properties 
  WHERE status = 'available' 
  LIMIT 3
);

-- Create some approved property applications for the occupied properties
INSERT INTO property_applications (property_id, tenant_id, status, created_at, updated_at)
SELECT 
  p.id as property_id,
  tp.user_id as tenant_id,
  'approved' as status,
  now() as created_at,
  now() as updated_at
FROM properties p
CROSS JOIN tenant_profiles tp
WHERE p.status = 'occupied'
AND tp.user_id IN (
  SELECT user_id FROM tenant_profiles LIMIT 3
)
LIMIT 3;

-- Make sure we have proper names in profiles for the tenants
UPDATE profiles 
SET first_name = CASE 
  WHEN first_name IS NULL OR first_name = '' THEN 'John'
  ELSE first_name
END,
last_name = CASE 
  WHEN last_name IS NULL OR last_name = '' THEN 'Smith'
  ELSE last_name
END,
phone = CASE 
  WHEN phone IS NULL OR phone = '' THEN '555-0123'
  ELSE phone
END
WHERE id IN (
  SELECT DISTINCT user_id FROM tenant_profiles LIMIT 3
);