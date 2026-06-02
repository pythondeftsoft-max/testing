-- Fix property_type enum to include the 4 types user wants: house, apartment, townhouse, mobile_home
-- First, update existing records to map to the new types
UPDATE properties 
SET property_type = CASE 
  WHEN property_type IN ('condo', 'duplex', 'studio', 'loft') THEN 'house'
  WHEN property_type = 'mobile_home' THEN 'mobile_home'
  WHEN property_type = 'townhouse' THEN 'townhouse'
  WHEN property_type = 'apartment' THEN 'apartment'
  WHEN property_type = 'house' THEN 'house'
  ELSE 'house'
END
WHERE property_type NOT IN ('house', 'apartment', 'townhouse', 'mobile_home');

-- Drop the old enum and create a new one with the 4 correct types
DROP TYPE IF EXISTS property_type CASCADE;
CREATE TYPE property_type AS ENUM ('house', 'apartment', 'townhouse', 'mobile_home');

-- Add the enum constraint back to the properties table
ALTER TABLE properties 
ALTER COLUMN property_type TYPE property_type USING property_type::text::property_type;