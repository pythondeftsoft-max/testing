-- Function to automatically assign territory to properties based on state and country
CREATE OR REPLACE FUNCTION assign_property_territory()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update territory_id if state or country changed (or on INSERT)
  IF (TG_OP = 'INSERT' OR OLD.state IS DISTINCT FROM NEW.state OR OLD.country IS DISTINCT FROM NEW.country) THEN
    -- Look up matching territory
    SELECT id INTO NEW.territory_id
    FROM territories
    WHERE region_code = NEW.state 
      AND country = NEW.country
      AND is_active = true
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for property territory assignment
DROP TRIGGER IF EXISTS trigger_assign_property_territory ON properties;
CREATE TRIGGER trigger_assign_property_territory
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION assign_property_territory();

-- Function to automatically assign territory to units from parent property
CREATE OR REPLACE FUNCTION assign_unit_territory()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update territory_id if property_id changed (or on INSERT)
  IF (TG_OP = 'INSERT' OR OLD.property_id IS DISTINCT FROM NEW.property_id) THEN
    -- Inherit territory from parent property
    SELECT territory_id INTO NEW.territory_id
    FROM properties
    WHERE id = NEW.property_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for unit territory inheritance
DROP TRIGGER IF EXISTS trigger_assign_unit_territory ON property_units;
CREATE TRIGGER trigger_assign_unit_territory
  BEFORE INSERT OR UPDATE ON property_units
  FOR EACH ROW
  EXECUTE FUNCTION assign_unit_territory();

-- One-time backfill: Update existing properties with matching territories
UPDATE properties
SET territory_id = t.id
FROM territories t
WHERE properties.territory_id IS NULL
  AND properties.state IS NOT NULL
  AND properties.country IS NOT NULL
  AND t.region_code = properties.state
  AND t.country = properties.country
  AND t.is_active = true;

-- One-time backfill: Update existing units to inherit from parent properties
UPDATE property_units
SET territory_id = p.territory_id
FROM properties p
WHERE property_units.territory_id IS NULL
  AND property_units.property_id = p.id
  AND p.territory_id IS NOT NULL;