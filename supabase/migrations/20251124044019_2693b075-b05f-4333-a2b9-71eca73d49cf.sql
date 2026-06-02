-- First, fix the property with 0 bed/bath by setting it to off market
UPDATE properties 
SET on_market = false 
WHERE on_market = true AND (bedrooms = 0 OR bathrooms = 0);

-- Auto-pause properties when primary applicant is set
CREATE OR REPLACE FUNCTION auto_pause_property_on_primary()
RETURNS TRIGGER AS $$
BEGIN
  -- When an application gets a primary applicant, pause the property
  IF NEW.is_primary_applicant = true AND (OLD.is_primary_applicant IS NULL OR OLD.is_primary_applicant = false) THEN
    -- Update the property to not be on market
    UPDATE properties 
    SET on_market = false,
        updated_at = now()
    WHERE id = NEW.property_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for all three application types
DROP TRIGGER IF EXISTS property_applications_auto_pause ON property_applications;
CREATE TRIGGER property_applications_auto_pause
  AFTER UPDATE OF is_primary_applicant ON property_applications
  FOR EACH ROW
  EXECUTE FUNCTION auto_pause_property_on_primary();

DROP TRIGGER IF EXISTS marketplace_applications_auto_pause ON marketplace_applications;
CREATE TRIGGER marketplace_applications_auto_pause
  AFTER UPDATE OF is_primary_applicant ON marketplace_applications
  FOR EACH ROW
  EXECUTE FUNCTION auto_pause_property_on_primary();

DROP TRIGGER IF EXISTS unit_applications_auto_pause ON unit_applications;
CREATE TRIGGER unit_applications_auto_pause
  AFTER UPDATE OF is_primary_applicant ON unit_applications
  FOR EACH ROW
  EXECUTE FUNCTION auto_pause_property_on_primary();

-- Add validation for bed/bath on property listings (only for NEW listings going forward)
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_bedrooms_bathrooms_check;
ALTER TABLE properties ADD CONSTRAINT properties_bedrooms_bathrooms_check 
  CHECK (
    (on_market = false) OR 
    (on_market = true AND bedrooms > 0 AND bathrooms > 0)
  );