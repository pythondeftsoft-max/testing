-- Function to backfill properties when a territory is created or updated
CREATE OR REPLACE FUNCTION backfill_properties_on_territory_change()
RETURNS TRIGGER AS $$
DECLARE
  updated_properties_count INTEGER;
  updated_units_count INTEGER;
BEGIN
  -- Update properties that match the new/updated territory
  WITH updated_props AS (
    UPDATE properties
    SET territory_id = NEW.id
    WHERE territory_id IS NULL
      AND state = NEW.region_code
      AND country = NEW.country
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

-- Create trigger for territory creation/update backfill
DROP TRIGGER IF EXISTS trigger_backfill_on_territory_change ON territories;
CREATE TRIGGER trigger_backfill_on_territory_change
  AFTER INSERT OR UPDATE OF region_code, country ON territories
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION backfill_properties_on_territory_change();