-- Fix auto_pause_property_on_primary to only pause entire property for single-unit properties
CREATE OR REPLACE FUNCTION auto_pause_property_on_primary()
RETURNS TRIGGER AS $$
DECLARE
  v_property_id UUID;
  v_unit_id UUID;
  v_unit_count INTEGER;
BEGIN
  -- Handle when is_primary_applicant is set to TRUE
  IF NEW.is_primary_applicant = TRUE AND (OLD.is_primary_applicant IS NULL OR OLD.is_primary_applicant = FALSE) THEN
    v_unit_id := NEW.unit_id;
    
    IF v_unit_id IS NOT NULL THEN
      -- Get property_id and unit_count from unit
      SELECT pu.property_id, p.unit_count 
      INTO v_property_id, v_unit_count
      FROM property_units pu
      JOIN properties p ON p.id = pu.property_id
      WHERE pu.id = v_unit_id;
      
      IF v_property_id IS NOT NULL THEN
        -- Always pause the unit
        UPDATE property_units
        SET 
          on_market = FALSE,
          status = 'in_process',
          updated_at = NOW()
        WHERE id = v_unit_id;
        
        -- Only pause the property if it's single-family (unit_count = 1 or NULL)
        IF v_unit_count IS NULL OR v_unit_count <= 1 THEN
          UPDATE properties
          SET on_market = FALSE, updated_at = NOW()
          WHERE id = v_property_id;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Handle when is_primary_applicant is set to FALSE (rejection or removal)
  IF NEW.is_primary_applicant = FALSE AND OLD.is_primary_applicant = TRUE THEN
    v_unit_id := NEW.unit_id;
    
    IF v_unit_id IS NOT NULL THEN
      -- Get property_id and unit_count
      SELECT pu.property_id, p.unit_count 
      INTO v_property_id, v_unit_count
      FROM property_units pu
      JOIN properties p ON p.id = pu.property_id
      WHERE pu.id = v_unit_id;
      
      IF v_property_id IS NOT NULL THEN
        -- Always restore the specific unit to market
        UPDATE property_units
        SET 
          on_market = TRUE,
          status = 'available',
          updated_at = NOW()
        WHERE id = v_unit_id;
        
        -- Only restore property if single-family
        IF v_unit_count IS NULL OR v_unit_count <= 1 THEN
          UPDATE properties
          SET on_market = TRUE, updated_at = NOW()
          WHERE id = v_property_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- One-time data fix: Restore multi-unit Matlock property to market
UPDATE properties 
SET on_market = TRUE, updated_at = NOW()
WHERE street_address ILIKE '%matlock%' AND unit_count > 1;