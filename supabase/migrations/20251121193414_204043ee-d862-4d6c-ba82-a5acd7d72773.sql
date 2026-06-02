-- Fix database field mapping for existing properties
-- This updates properties where street_address is NULL or address doesn't contain full address

-- First, populate street_address from address for records where street_address is NULL
UPDATE properties 
SET street_address = address
WHERE street_address IS NULL 
  AND address IS NOT NULL 
  AND address NOT LIKE '%,%';

-- Then, update address to be the full formatted address where it's currently just the street
UPDATE properties 
SET address = CONCAT_WS(', ', street_address, city, state || ' ' || zipcode)
WHERE street_address IS NOT NULL
  AND address NOT LIKE '%,%';

-- Clear incorrect London coordinates for NY/US properties
-- These are properties with state = NY but coordinates in London area
UPDATE properties
SET 
  latitude = NULL, 
  longitude = NULL
WHERE state = 'NY' 
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude BETWEEN 51.0 AND 52.0 
  AND longitude BETWEEN -1.0 AND 0.5;