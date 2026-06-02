-- Update triggers to handle country code mapping (US -> United States)

-- Updated property territory assignment function
CREATE OR REPLACE FUNCTION assign_property_territory()
RETURNS TRIGGER AS $$
DECLARE
  country_name TEXT;
BEGIN
  -- Only update territory_id if state or country changed (or on INSERT)
  IF (TG_OP = 'INSERT' OR OLD.state IS DISTINCT FROM NEW.state OR OLD.country IS DISTINCT FROM NEW.country) THEN
    -- Map country code to full name
    country_name := CASE 
      WHEN NEW.country = 'US' THEN 'United States'
      ELSE NEW.country
    END;
    
    -- Look up matching territory
    SELECT id INTO NEW.territory_id
    FROM territories
    WHERE region_code = NEW.state 
      AND country = country_name
      AND is_active = true
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated backfill function for territory changes
CREATE OR REPLACE FUNCTION backfill_properties_on_territory_change()
RETURNS TRIGGER AS $$
DECLARE
  updated_properties_count INTEGER;
  updated_units_count INTEGER;
BEGIN
  -- Update properties that match the new/updated territory (handle country code mapping)
  WITH updated_props AS (
    UPDATE properties
    SET territory_id = NEW.id
    WHERE territory_id IS NULL
      AND state = NEW.region_code
      AND (
        (country = 'US' AND NEW.country = 'United States') OR
        (country = NEW.country)
      )
    RETURNING id, territory_id
  )
  SELECT COUNT(*) INTO updated_properties_count FROM updated_props;

  -- Update units for those properties
  WITH updated_property_units AS (
    UPDATE property_units
    SET territory_id = NEW.id
    WHERE territory_id IS NULL
      AND property_id IN (
        SELECT id FROM properties 
        WHERE territory_id = NEW.id
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_units_count FROM updated_property_units;

  -- Log the backfill results
  RAISE NOTICE 'Territory % (%, %): Backfilled % properties and % units', 
    NEW.territory_name, NEW.region_code, NEW.country, 
    updated_properties_count, updated_units_count;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Run backfill again with corrected mapping
UPDATE properties
SET territory_id = t.id
FROM territories t
WHERE properties.territory_id IS NULL
  AND properties.state IS NOT NULL
  AND properties.state = t.region_code
  AND (
    (properties.country = 'US' AND t.country = 'United States') OR
    (properties.country = t.country)
  )
  AND t.is_active = true;

-- Backfill units from their parent properties
UPDATE property_units
SET territory_id = p.territory_id
FROM properties p
WHERE property_units.territory_id IS NULL
  AND property_units.property_id = p.id
  AND p.territory_id IS NOT NULL;