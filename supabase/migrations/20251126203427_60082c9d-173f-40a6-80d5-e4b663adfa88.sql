-- Function to auto-assign territory based on property state
CREATE OR REPLACE FUNCTION auto_assign_territory_from_state()
RETURNS TRIGGER AS $$
DECLARE
  v_territory_id UUID;
BEGIN
  IF NEW.territory_id IS NULL AND NEW.state IS NOT NULL THEN
    SELECT id INTO v_territory_id
    FROM territories
    WHERE UPPER(region_code) = UPPER(NEW.state)
    LIMIT 1;
    
    IF v_territory_id IS NOT NULL THEN
      NEW.territory_id := v_territory_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign unit territory on insert
CREATE OR REPLACE FUNCTION auto_assign_unit_territory()
RETURNS TRIGGER AS $$
DECLARE
  v_property_territory UUID;
BEGIN
  IF NEW.territory_id IS NULL THEN
    SELECT territory_id INTO v_property_territory
    FROM properties
    WHERE id = NEW.property_id;
    
    IF v_property_territory IS NOT NULL THEN
      NEW.territory_id := v_property_territory;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to cascade territory from property to units
CREATE OR REPLACE FUNCTION cascade_territory_to_units()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.territory_id IS NOT NULL AND (OLD.territory_id IS NULL OR OLD.territory_id != NEW.territory_id) THEN
    EXECUTE format('UPDATE property_units SET territory_id = $1, updated_at = now() WHERE property_id = $2 AND territory_id IS NULL')
    USING NEW.territory_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bypass user triggers for backfill (keeps system triggers active)
SET session_replication_role = replica;

-- Backfill properties with NULL territory based on state
UPDATE properties p
SET territory_id = t.id
FROM territories t
WHERE p.territory_id IS NULL
  AND p.state IS NOT NULL
  AND UPPER(t.region_code) = UPPER(p.state);

-- Backfill units from their property
UPDATE property_units pu
SET territory_id = p.territory_id
FROM properties p
WHERE pu.property_id = p.id
  AND pu.territory_id IS NULL
  AND p.territory_id IS NOT NULL;

-- Re-enable user triggers
SET session_replication_role = DEFAULT;

-- Create the new triggers
CREATE TRIGGER trigger_auto_assign_property_territory
BEFORE INSERT OR UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION auto_assign_territory_from_state();

CREATE TRIGGER trigger_cascade_territory_to_units
AFTER UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION cascade_territory_to_units();

CREATE TRIGGER trigger_auto_assign_unit_territory
BEFORE INSERT ON property_units
FOR EACH ROW
EXECUTE FUNCTION auto_assign_unit_territory();