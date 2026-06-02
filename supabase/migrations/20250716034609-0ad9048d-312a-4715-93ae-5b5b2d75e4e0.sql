-- Fix property_type enum with proper type casting
-- Drop the old enum and create a new one with the 4 correct types first
DROP TYPE IF EXISTS property_type CASCADE;
CREATE TYPE property_type AS ENUM ('house', 'apartment', 'townhouse', 'mobile_home');

-- Add the property_type column back to properties table with the new enum
ALTER TABLE properties 
ADD COLUMN property_type_new property_type DEFAULT 'house';

-- Update the new column with mapped values from the old address field or default
UPDATE properties 
SET property_type_new = CASE 
  WHEN property_type_old IN ('condo', 'duplex', 'studio', 'loft', 'house') THEN 'house'::property_type
  WHEN property_type_old = 'mobile_home' THEN 'mobile_home'::property_type
  WHEN property_type_old = 'townhouse' THEN 'townhouse'::property_type
  WHEN property_type_old = 'apartment' THEN 'apartment'::property_type
  ELSE 'house'::property_type
END;

-- Drop the old column and rename the new one
ALTER TABLE properties DROP COLUMN IF EXISTS property_type_old;
ALTER TABLE properties RENAME COLUMN property_type_new TO property_type;