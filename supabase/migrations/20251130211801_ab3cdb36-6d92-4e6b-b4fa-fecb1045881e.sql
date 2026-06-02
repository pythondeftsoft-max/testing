-- Step 1: Fix auto_pause_listing_at_six on property_applications
-- Handle both property-level (unit_id IS NULL) and unit-level applications
CREATE OR REPLACE FUNCTION auto_pause_listing_at_six()
RETURNS TRIGGER AS $$
DECLARE
  app_count INTEGER;
BEGIN
  -- Handle property-level applications (unit_id IS NULL)
  IF NEW.unit_id IS NULL THEN
    -- Count applications by property_id where unit_id IS NULL
    SELECT COUNT(*) INTO app_count
    FROM property_applications 
    WHERE property_id = NEW.property_id 
      AND unit_id IS NULL
      AND status NOT IN ('withdrawn', 'rejected', 'cancelled');
    
    IF app_count >= 6 THEN
      UPDATE properties
      SET on_market = false, updated_at = NOW()
      WHERE id = NEW.property_id;
    END IF;
  ELSE
    -- Count applications by unit_id
    SELECT COUNT(*) INTO app_count
    FROM property_applications 
    WHERE unit_id = NEW.unit_id 
      AND status NOT IN ('withdrawn', 'rejected', 'cancelled');
    
    IF app_count >= 6 THEN
      UPDATE property_units
      SET on_market = false, updated_at = NOW()
      WHERE id = NEW.unit_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Step 2: Fix auto_pause_listing_at_limit on marketplace_applications
-- Add SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION auto_pause_listing_at_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_app_count INTEGER;
  v_property_id UUID;
BEGIN
  -- Count current applications for this unit
  SELECT COUNT(*) INTO v_app_count
  FROM marketplace_applications
  WHERE unit_id = NEW.unit_id
    AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

  -- If at limit (6), pause listing
  IF v_app_count >= 6 THEN
    SELECT property_id INTO v_property_id
    FROM property_units WHERE id = NEW.unit_id;

    UPDATE property_units
    SET on_market = FALSE
    WHERE id = NEW.unit_id;

    UPDATE properties
    SET on_market = FALSE
    WHERE id = v_property_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Step 3: Add auto-unpause trigger for marketplace_applications
CREATE OR REPLACE FUNCTION auto_unpause_listing_below_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_active_count INTEGER;
  v_has_primary BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IN ('withdrawn', 'rejected', 'cancelled') 
     AND OLD.status NOT IN ('withdrawn', 'rejected', 'cancelled') THEN
    
    SELECT COUNT(*) INTO v_active_count
    FROM marketplace_applications
    WHERE unit_id = NEW.unit_id
      AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

    SELECT EXISTS(
      SELECT 1 FROM marketplace_applications
      WHERE unit_id = NEW.unit_id
        AND is_primary_applicant = true
        AND status NOT IN ('withdrawn', 'rejected', 'cancelled')
    ) INTO v_has_primary;

    IF v_active_count < 6 AND NOT v_has_primary THEN
      UPDATE property_units
      SET on_market = true
      WHERE id = NEW.unit_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP TRIGGER IF EXISTS trigger_auto_unpause_below_limit ON marketplace_applications;
CREATE TRIGGER trigger_auto_unpause_below_limit
AFTER UPDATE ON marketplace_applications
FOR EACH ROW
EXECUTE FUNCTION auto_unpause_listing_below_limit();

-- Step 4: Add auto-unpause trigger for property_applications
CREATE OR REPLACE FUNCTION auto_unpause_property_below_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_active_count INTEGER;
  v_has_primary BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IN ('withdrawn', 'rejected', 'cancelled') 
     AND OLD.status NOT IN ('withdrawn', 'rejected', 'cancelled') THEN
    
    IF NEW.unit_id IS NULL THEN
      -- Property-level applications
      SELECT COUNT(*) INTO v_active_count
      FROM property_applications
      WHERE property_id = NEW.property_id
        AND unit_id IS NULL
        AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

      SELECT EXISTS(
        SELECT 1 FROM property_applications
        WHERE property_id = NEW.property_id
          AND unit_id IS NULL
          AND is_primary_applicant = true
          AND status NOT IN ('withdrawn', 'rejected', 'cancelled')
      ) INTO v_has_primary;

      IF v_active_count < 6 AND NOT v_has_primary THEN
        UPDATE properties
        SET on_market = true
        WHERE id = NEW.property_id;
      END IF;
    ELSE
      -- Unit-level applications
      SELECT COUNT(*) INTO v_active_count
      FROM property_applications
      WHERE unit_id = NEW.unit_id
        AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

      SELECT EXISTS(
        SELECT 1 FROM property_applications
        WHERE unit_id = NEW.unit_id
          AND is_primary_applicant = true
          AND status NOT IN ('withdrawn', 'rejected', 'cancelled')
      ) INTO v_has_primary;

      IF v_active_count < 6 AND NOT v_has_primary THEN
        UPDATE property_units
        SET on_market = true
        WHERE id = NEW.unit_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP TRIGGER IF EXISTS trigger_auto_unpause_property_below_limit ON property_applications;
CREATE TRIGGER trigger_auto_unpause_property_below_limit
AFTER UPDATE ON property_applications
FOR EACH ROW
EXECUTE FUNCTION auto_unpause_property_below_limit();

-- Step 5: One-time fix - pause all 3 listings that are currently at limit
-- Fix property-level listings (5194 Coney Island & 456 Pine)
UPDATE properties 
SET on_market = false, updated_at = NOW()
WHERE on_market = true
  AND (
    SELECT COUNT(*) 
    FROM property_applications pa
    WHERE pa.property_id = properties.id
      AND pa.unit_id IS NULL
      AND pa.status NOT IN ('withdrawn', 'rejected', 'cancelled')
  ) >= 6;

-- Fix unit-level listings in marketplace_applications (26 Matlock - Unit 3)
UPDATE property_units 
SET on_market = false, updated_at = NOW()
WHERE on_market = true
  AND (
    SELECT COUNT(*) 
    FROM marketplace_applications ma
    WHERE ma.unit_id = property_units.id
      AND ma.status NOT IN ('withdrawn', 'rejected', 'cancelled')
  ) >= 6;

-- Step 6: Clean up wrong triggers from earlier attempts
DROP TRIGGER IF EXISTS trigger_auto_pause_on_app_limit ON property_applications;
DROP TRIGGER IF EXISTS trigger_auto_unpause_on_app_change ON property_applications;
DROP FUNCTION IF EXISTS auto_pause_unit_on_application_limit();
DROP FUNCTION IF EXISTS auto_unpause_unit_on_application_change();