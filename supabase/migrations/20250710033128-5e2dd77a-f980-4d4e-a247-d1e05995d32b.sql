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

-- Update existing property applications to 'approved' status for occupied properties
UPDATE property_applications 
SET status = 'approved',
    updated_at = now()
WHERE property_id IN (
  SELECT id FROM properties WHERE status = 'occupied'
)
AND status != 'approved';

-- Make sure we have proper names in profiles for the tenants
UPDATE profiles 
SET first_name = CASE 
  WHEN first_name IS NULL OR first_name = '' THEN 'Sarah'
  ELSE first_name
END,
last_name = CASE 
  WHEN last_name IS NULL OR last_name = '' THEN 'Johnson'
  ELSE last_name
END,
phone = CASE 
  WHEN phone IS NULL OR phone = '' THEN '555-0234'
  ELSE phone
END
WHERE id IN (
  SELECT DISTINCT pa.tenant_id 
  FROM property_applications pa
  JOIN properties p ON pa.property_id = p.id
  WHERE p.status = 'occupied' AND pa.status = 'approved'
);