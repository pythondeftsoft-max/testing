-- Fix the 160 East Walnut Street property with proper bedroom/bathroom counts
UPDATE properties 
SET bedrooms = 3, 
    bathrooms = 2.0,
    updated_at = now()
WHERE street_address = '160 East Walnut Street' 
  AND city = 'Springfield' 
  AND state = 'IL';