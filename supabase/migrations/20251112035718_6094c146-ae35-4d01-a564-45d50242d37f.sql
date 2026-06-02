-- Create trigger to auto-sync unit_count with property_units table

-- Function to update unit_count based on actual property_units
CREATE OR REPLACE FUNCTION sync_property_unit_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the property's unit_count to match actual property_units count
  UPDATE properties
  SET unit_count = (
    SELECT COUNT(*)::integer
    FROM property_units
    WHERE property_id = COALESCE(NEW.property_id, OLD.property_id)
  )
  WHERE id = COALESCE(NEW.property_id, OLD.property_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on INSERT: when a unit is added
CREATE TRIGGER sync_unit_count_on_insert
AFTER INSERT ON property_units
FOR EACH ROW
EXECUTE FUNCTION sync_property_unit_count();

-- Trigger on DELETE: when a unit is removed
CREATE TRIGGER sync_unit_count_on_delete
AFTER DELETE ON property_units
FOR EACH ROW
EXECUTE FUNCTION sync_property_unit_count();