-- Simple fix: Drop the enum and recreate with 4 types, then add back to table
DROP TYPE IF EXISTS property_type CASCADE;
CREATE TYPE property_type AS ENUM ('house', 'apartment', 'townhouse', 'mobile_home');

-- Add the property_type column back to properties table
ALTER TABLE properties 
ADD COLUMN property_type property_type DEFAULT 'house';