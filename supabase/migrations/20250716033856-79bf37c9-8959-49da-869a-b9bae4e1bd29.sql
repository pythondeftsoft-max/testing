
-- Update the property_type enum to only include 'house' and 'apartment'
-- First, update existing records that use other types to use 'house' or 'apartment'
UPDATE properties 
SET property_type = CASE 
  WHEN property_type IN ('condo', 'townhouse', 'duplex', 'studio', 'loft') THEN 'house'
  WHEN property_type = 'mobile_home' THEN 'house'
  WHEN property_type = 'other' THEN 'house'
  ELSE property_type
END
WHERE property_type NOT IN ('house', 'apartment');

-- Drop the old enum and create a new one with only house and apartment
DROP TYPE IF EXISTS property_type CASCADE;
CREATE TYPE property_type AS ENUM ('house', 'apartment');

-- Add the enum constraint back to the properties table
ALTER TABLE properties 
ALTER COLUMN property_type TYPE property_type USING property_type::text::property_type;

-- Remove parking and pet policy related columns from properties table
ALTER TABLE properties 
DROP COLUMN IF EXISTS parking_type,
DROP COLUMN IF EXISTS garage_spaces,
DROP COLUMN IF EXISTS pet_policy,
DROP COLUMN IF EXISTS max_pets,
DROP COLUMN IF EXISTS pet_deposit;

-- Also remove these columns from property_units table if they exist
ALTER TABLE property_units 
DROP COLUMN IF EXISTS parking_type,
DROP COLUMN IF EXISTS garage_spaces,
DROP COLUMN IF EXISTS pet_policy,
DROP COLUMN IF EXISTS max_pets,
DROP COLUMN IF EXISTS pet_deposit;
