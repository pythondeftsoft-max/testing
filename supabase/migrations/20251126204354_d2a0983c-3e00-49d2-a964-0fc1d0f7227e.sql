-- Fix 120 Mc Alpine Drive unit data to match property
UPDATE property_units 
SET 
  bedrooms = 4,
  bathrooms = 1,
  on_market = true,
  updated_at = now()
WHERE id = 'fa56a05a-ce19-476b-b754-d14efd000485';

-- Create function to auto-populate unit bed/bath/rent from property when missing
CREATE OR REPLACE FUNCTION auto_populate_unit_from_property()
RETURNS TRIGGER AS $$
DECLARE
  v_property RECORD;
BEGIN
  -- Only populate if unit values are NULL or 0
  IF (NEW.bedrooms IS NULL OR NEW.bedrooms = 0 OR 
      NEW.bathrooms IS NULL OR NEW.bathrooms = 0 OR 
      NEW.monthly_rent IS NULL) THEN
    
    SELECT bedrooms, bathrooms, monthly_rent 
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
    
    IF NEW.monthly_rent IS NULL THEN
      NEW.monthly_rent := v_property.monthly_rent;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Create trigger to auto-populate unit data on insert/update
DROP TRIGGER IF EXISTS trigger_auto_populate_unit_from_property ON property_units;
CREATE TRIGGER trigger_auto_populate_unit_from_property
BEFORE INSERT OR UPDATE ON property_units
FOR EACH ROW
EXECUTE FUNCTION auto_populate_unit_from_property();