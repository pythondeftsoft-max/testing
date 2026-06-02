-- 1. Fix 120 Mc Alpine Drive - Update property and unit monthly_rent to 1234
UPDATE properties 
SET monthly_rent = 1234, updated_at = now()
WHERE id = 'd225dfdf-74ab-4951-a01b-c75359d7e4b3';

UPDATE property_units 
SET monthly_rent = 1234, updated_at = now()
WHERE id = 'fa56a05a-ce19-476b-b754-d14efd000485';

-- 2. Create trigger to auto-sync monthly_rent from desired_rent for on-market properties
CREATE OR REPLACE FUNCTION sync_monthly_rent_from_desired_rent()
RETURNS TRIGGER AS $$
BEGIN
  -- When a property is on market and has desired_rent but no monthly_rent, sync it
  IF NEW.on_market = true AND NEW.desired_rent IS NOT NULL AND NEW.monthly_rent IS NULL THEN
    NEW.monthly_rent := NEW.desired_rent;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_sync_monthly_rent_from_desired_rent ON properties;
CREATE TRIGGER trigger_sync_monthly_rent_from_desired_rent
BEFORE INSERT OR UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION sync_monthly_rent_from_desired_rent();

-- 3. Update auto_populate_unit_from_property to use desired_rent as fallback
CREATE OR REPLACE FUNCTION auto_populate_unit_from_property()
RETURNS TRIGGER AS $$
DECLARE
  v_property RECORD;
BEGIN
  -- Only populate if unit values are NULL or 0
  IF (NEW.bedrooms IS NULL OR NEW.bedrooms = 0 OR 
      NEW.bathrooms IS NULL OR NEW.bathrooms = 0 OR 
      NEW.monthly_rent IS NULL) THEN
    
    SELECT bedrooms, bathrooms, monthly_rent, desired_rent 
    INTO v_property
    FROM properties
    WHERE id = NEW.property_id;
    
    -- Populate missing values from property
    IF NEW.bedrooms IS NULL OR NEW.bedrooms = 0 THEN
      NEW.bedrooms := COALESCE(v_property.bedrooms, NEW.bedrooms);
    END IF;
    
    IF NEW.bathrooms IS NULL OR NEW.bathrooms = 0 THEN
      NEW.bathrooms := COALESCE(v_property.bathrooms, NEW.bathrooms);
    END IF;
    
    -- Use monthly_rent first, then fall back to desired_rent
    IF NEW.monthly_rent IS NULL THEN
      NEW.monthly_rent := COALESCE(v_property.monthly_rent, v_property.desired_rent);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;