-- Add lease dates to more properties for better testing
UPDATE properties 
SET 
  lease_start_date = CURRENT_DATE - INTERVAL '8 months',
  lease_end_date = CURRENT_DATE + INTERVAL '4 months'
WHERE lease_start_date IS NULL 
AND id IN (
  SELECT p.id 
  FROM properties p
  JOIN property_applications pa ON p.id = pa.property_id
  WHERE pa.status = 'approved'
  ORDER BY p.created_at
  LIMIT 10
);