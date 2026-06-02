
-- Update the occupancy_status for 98 Euclid Ave to 'occupied' since it has an approved tenant
UPDATE properties 
SET occupancy_status = 'occupied',
    updated_at = now()
WHERE address = '98 Euclid Ave' 
AND EXISTS (
  SELECT 1 FROM property_applications 
  WHERE property_applications.property_id = properties.id 
  AND property_applications.status = 'approved'
);
