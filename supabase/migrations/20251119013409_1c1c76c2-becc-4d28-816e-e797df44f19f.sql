-- Fix property deletion trigger conflict
-- Split the auto-delist logic into BEFORE and AFTER triggers

-- BEFORE trigger: Only modify the current property row
CREATE OR REPLACE FUNCTION auto_delist_property_on_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if deleted_at is being set (was NULL, now NOT NULL)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Set the property itself to off-market
    NEW.on_market := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AFTER trigger: Update related property_units
CREATE OR REPLACE FUNCTION auto_delist_units_on_property_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if deleted_at is being set (was NULL, now NOT NULL)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Set all units in this property to off-market
    UPDATE property_units
    SET on_market = false
    WHERE property_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the old BEFORE trigger with the new one
DROP TRIGGER IF EXISTS trigger_auto_delist_on_soft_delete ON properties;
CREATE TRIGGER trigger_auto_delist_on_soft_delete
  BEFORE UPDATE OF deleted_at ON properties
  FOR EACH ROW
  EXECUTE FUNCTION auto_delist_property_on_soft_delete();

-- Create new AFTER trigger for units
DROP TRIGGER IF EXISTS trigger_auto_delist_units_on_soft_delete ON properties;
CREATE TRIGGER trigger_auto_delist_units_on_soft_delete
  AFTER UPDATE OF deleted_at ON properties
  FOR EACH ROW
  EXECUTE FUNCTION auto_delist_units_on_property_soft_delete();

-- Add comments
COMMENT ON FUNCTION auto_delist_property_on_soft_delete() IS 'Sets on_market=false for property when soft-deleted (BEFORE trigger)';
COMMENT ON FUNCTION auto_delist_units_on_property_soft_delete() IS 'Sets on_market=false for all units when parent property is soft-deleted (AFTER trigger)';