-- Auto-retry logic: Re-queue property units when key data is fixed

-- Function to detect if a property unit should be re-queued for assignment
CREATE OR REPLACE FUNCTION auto_requeue_fixed_property_units()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if the unit is currently unassigned and on market
  IF NEW.assigned_worker_id IS NULL AND NEW.on_market = true THEN
    -- Check if critical fields were just fixed (changed from NULL/0 to valid values)
    IF (
      -- Monthly rent was added/updated
      (OLD.monthly_rent IS NULL OR OLD.monthly_rent = 0) AND (NEW.monthly_rent IS NOT NULL AND NEW.monthly_rent > 0)
      OR
      -- Territory was added
      (OLD.territory_id IS NULL) AND (NEW.territory_id IS NOT NULL)
      OR
      -- Property was put on market
      (OLD.on_market = false AND NEW.on_market = true)
    ) THEN
      -- Log that this property is ready for re-assignment
      RAISE NOTICE 'Property unit % is now ready for assignment after data fix', NEW.id;
      
      -- Set a flag to indicate this should be picked up by next auto-assign
      -- by ensuring pipeline_stage is NULL (puts it in the unassigned queue)
      NEW.pipeline_stage := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Create trigger on property_units
DROP TRIGGER IF EXISTS trigger_auto_requeue_fixed_units ON property_units;
CREATE TRIGGER trigger_auto_requeue_fixed_units
BEFORE UPDATE ON property_units
FOR EACH ROW
EXECUTE FUNCTION auto_requeue_fixed_property_units();

-- Also handle when properties table is updated (propagate to units)
CREATE OR REPLACE FUNCTION auto_requeue_fixed_properties()
RETURNS TRIGGER AS $$
BEGIN
  -- If critical property fields were fixed, update all unassigned units to be ready for re-queue
  IF (
    -- Monthly rent was added/updated
    (OLD.monthly_rent IS NULL OR OLD.monthly_rent = 0) AND (NEW.monthly_rent IS NOT NULL AND NEW.monthly_rent > 0)
    OR
    -- Territory was added
    (OLD.territory_id IS NULL) AND (NEW.territory_id IS NOT NULL)
    OR
    -- Property was put on market
    (OLD.on_market = false AND NEW.on_market = true)
  ) THEN
    -- Update all unassigned units for this property to be ready for assignment
    UPDATE property_units
    SET 
      pipeline_stage = NULL,
      updated_at = now()
    WHERE 
      property_id = NEW.id 
      AND assigned_worker_id IS NULL
      AND on_market = true;
      
    RAISE NOTICE 'Property % units re-queued after data fix', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Create trigger on properties
DROP TRIGGER IF EXISTS trigger_auto_requeue_fixed_properties ON properties;
CREATE TRIGGER trigger_auto_requeue_fixed_properties
AFTER UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION auto_requeue_fixed_properties();