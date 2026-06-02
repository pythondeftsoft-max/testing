-- Drop and recreate landlord_reject_primary_applicant to restore on_market status
-- This version works with marketplace_applications table

DROP FUNCTION IF EXISTS landlord_reject_primary_applicant(UUID, TEXT);

CREATE FUNCTION landlord_reject_primary_applicant(
  p_unit_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_primary_id UUID;
  v_property_id UUID;
BEGIN
  -- Get the current primary applicant for this unit
  SELECT id INTO v_current_primary_id
  FROM marketplace_applications
  WHERE unit_id = p_unit_id
    AND is_primary_applicant = TRUE
  LIMIT 1;

  IF v_current_primary_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No primary applicant found for this unit'
    );
  END IF;

  -- Get property_id from the unit
  SELECT property_id INTO v_property_id
  FROM property_units
  WHERE id = p_unit_id;

  -- Update the primary applicant's status to withdrawn and remove primary status
  UPDATE marketplace_applications
  SET 
    status = 'withdrawn',
    is_primary_applicant = FALSE,
    updated_at = NOW()
  WHERE id = v_current_primary_id;

  -- Restore unit to available and back on market
  UPDATE property_units
  SET 
    status = 'available',
    on_market = TRUE,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Restore property back on market
  UPDATE properties
  SET
    on_market = TRUE,
    updated_at = NOW()
  WHERE id = v_property_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Primary applicant rejected and property restored to market',
    'rejected_applicant_id', v_current_primary_id
  );
END;
$$;

-- Enhance auto_pause_property_on_primary trigger to be bidirectional
-- When is_primary_applicant changes, update property on_market status accordingly

CREATE OR REPLACE FUNCTION auto_pause_property_on_primary()
RETURNS TRIGGER AS $$
DECLARE
  v_property_id UUID;
  v_unit_id UUID;
BEGIN
  -- Handle when is_primary_applicant is set to TRUE
  IF NEW.is_primary_applicant = TRUE AND (OLD.is_primary_applicant IS NULL OR OLD.is_primary_applicant = FALSE) THEN
    v_unit_id := NEW.unit_id;
    
    IF v_unit_id IS NOT NULL THEN
      -- Get property_id from unit
      SELECT property_id INTO v_property_id
      FROM property_units
      WHERE id = v_unit_id;
      
      -- Pause the property (take it off market)
      IF v_property_id IS NOT NULL THEN
        UPDATE properties
        SET 
          on_market = FALSE,
          updated_at = NOW()
        WHERE id = v_property_id;
        
        -- Also update the unit
        UPDATE property_units
        SET 
          on_market = FALSE,
          status = 'in_process',
          updated_at = NOW()
        WHERE id = v_unit_id;
      END IF;
    END IF;
  END IF;

  -- Handle when is_primary_applicant is set to FALSE (rejection or removal)
  IF NEW.is_primary_applicant = FALSE AND OLD.is_primary_applicant = TRUE THEN
    v_unit_id := NEW.unit_id;
    
    IF v_unit_id IS NOT NULL THEN
      -- Get property_id from unit
      SELECT property_id INTO v_property_id
      FROM property_units
      WHERE id = v_unit_id;
      
      -- Check if there are any other primary applicants for this property
      -- Only restore to market if no other units have primary applicants
      IF v_property_id IS NOT NULL THEN
        -- Check if any other units in this property have primary applicants
        IF NOT EXISTS (
          SELECT 1 FROM marketplace_applications ma
          JOIN property_units pu ON ma.unit_id = pu.id
          WHERE pu.property_id = v_property_id
            AND ma.is_primary_applicant = TRUE
            AND ma.id != NEW.id
        ) THEN
          -- No other primary applicants, restore property to market
          UPDATE properties
          SET 
            on_market = TRUE,
            updated_at = NOW()
          WHERE id = v_property_id;
        END IF;
        
        -- Restore the specific unit to market
        UPDATE property_units
        SET 
          on_market = TRUE,
          status = 'available',
          updated_at = NOW()
        WHERE id = v_unit_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS auto_pause_property_on_primary ON marketplace_applications;
CREATE TRIGGER auto_pause_property_on_primary
  AFTER INSERT OR UPDATE OF is_primary_applicant ON marketplace_applications
  FOR EACH ROW
  EXECUTE FUNCTION auto_pause_property_on_primary();