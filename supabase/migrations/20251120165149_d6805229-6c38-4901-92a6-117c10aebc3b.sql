-- Add listing timestamp columns to properties and property_units tables

-- Add columns to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS listed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delisted_at TIMESTAMPTZ;

-- Add columns to property_units table  
ALTER TABLE property_units 
ADD COLUMN IF NOT EXISTS listed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delisted_at TIMESTAMPTZ;

-- Create function to auto-update listing timestamps
CREATE OR REPLACE FUNCTION update_listing_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- When on_market changes from false to true, set listed_at
  IF NEW.on_market = true AND (OLD.on_market = false OR OLD.on_market IS NULL) THEN
    NEW.listed_at = NOW();
    NEW.delisted_at = NULL;
  END IF;
  
  -- When on_market changes from true to false, set delisted_at
  IF NEW.on_market = false AND OLD.on_market = true THEN
    NEW.delisted_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for properties table
DROP TRIGGER IF EXISTS properties_listing_timestamps ON properties;
CREATE TRIGGER properties_listing_timestamps
  BEFORE UPDATE OF on_market ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_timestamps();

-- Create trigger for property_units table
DROP TRIGGER IF EXISTS property_units_listing_timestamps ON property_units;
CREATE TRIGGER property_units_listing_timestamps
  BEFORE UPDATE OF on_market ON property_units
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_timestamps();

-- Backfill existing data for properties currently on market
UPDATE properties
SET listed_at = created_at
WHERE on_market = true AND listed_at IS NULL;

-- Backfill existing data for properties not on market  
UPDATE properties
SET delisted_at = updated_at
WHERE on_market = false AND delisted_at IS NULL;

-- Backfill existing data for units currently on market
UPDATE property_units
SET listed_at = created_at
WHERE on_market = true AND listed_at IS NULL;

-- Backfill existing data for units not on market
UPDATE property_units
SET delisted_at = updated_at
WHERE on_market = false AND delisted_at IS NULL;