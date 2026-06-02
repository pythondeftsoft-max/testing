-- Auto-delist properties and units when soft-deleted
-- This ensures deleted properties don't remain on_market=true and appear in queries

-- Create trigger function to auto-delist on soft delete
CREATE OR REPLACE FUNCTION auto_delist_on_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if deleted_at is being set (was NULL, now NOT NULL)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Set the property itself to off-market
    NEW.on_market := false;
    
    -- Also set all units in this property to off-market
    UPDATE property_units
    SET on_market = false
    WHERE property_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on properties table
DROP TRIGGER IF EXISTS trigger_auto_delist_on_soft_delete ON properties;
CREATE TRIGGER trigger_auto_delist_on_soft_delete
  BEFORE UPDATE OF deleted_at ON properties
  FOR EACH ROW
  EXECUTE FUNCTION auto_delist_on_soft_delete();

-- Add comment for documentation
COMMENT ON FUNCTION auto_delist_on_soft_delete() IS 'Automatically sets on_market=false for property and all units when property is soft-deleted';