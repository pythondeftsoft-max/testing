-- Fix auto-pause logic to only pause units for multi-unit properties, not entire properties
-- Also fix auto-unpause logic to match

-- 1. Fix auto_pause_listing_at_limit (for marketplace_applications on property_units)
CREATE OR REPLACE FUNCTION auto_pause_listing_at_limit()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = 'public'
LANGUAGE plpgsql
AS $$
DECLARE
  v_app_count INTEGER;
  v_unit_count INTEGER;
  v_property_id UUID;
BEGIN
  -- Count current applications for this unit
  SELECT COUNT(*) INTO v_app_count
  FROM marketplace_applications
  WHERE unit_id = NEW.unit_id
    AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

  -- If at limit (6), pause the unit
  IF v_app_count >= 6 THEN
    -- Get property_id and unit_count
    SELECT pu.property_id, p.unit_count INTO v_property_id, v_unit_count
    FROM property_units pu
    JOIN properties p ON p.id = pu.property_id
    WHERE pu.id = NEW.unit_id;

    -- Always pause the unit
    UPDATE property_units
    SET on_market = FALSE
    WHERE id = NEW.unit_id;

    -- Only pause property if it's single-family (unit_count = 1 or NULL)
    IF v_unit_count IS NULL OR v_unit_count <= 1 THEN
      UPDATE properties
      SET on_market = FALSE
      WHERE id = v_property_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Fix auto_pause_listing_at_six (for property_applications)
CREATE OR REPLACE FUNCTION auto_pause_listing_at_six()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = 'public'
LANGUAGE plpgsql
AS $$
DECLARE
  v_app_count INTEGER;
  v_unit_count INTEGER;
BEGIN
  -- Handle unit-level applications
  IF NEW.unit_id IS NOT NULL THEN
    -- Count applications for this unit
    SELECT COUNT(*) INTO v_app_count
    FROM property_applications
    WHERE unit_id = NEW.unit_id
      AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

    -- If at limit (6), pause the unit
    IF v_app_count >= 6 THEN
      -- Get unit_count
      SELECT p.unit_count INTO v_unit_count
      FROM property_units pu
      JOIN properties p ON p.id = pu.property_id
      WHERE pu.id = NEW.unit_id;

      -- Always pause the unit
      UPDATE property_units
      SET on_market = FALSE
      WHERE id = NEW.unit_id;

      -- Only pause property if single-family (unit_count = 1 or NULL)
      IF v_unit_count IS NULL OR v_unit_count <= 1 THEN
        UPDATE properties
        SET on_market = FALSE
        WHERE id = (SELECT property_id FROM property_units WHERE id = NEW.unit_id);
      END IF;
    END IF;
  ELSE
    -- Handle property-level applications (unit_id IS NULL)
    SELECT COUNT(*) INTO v_app_count
    FROM property_applications
    WHERE property_id = NEW.property_id
      AND unit_id IS NULL
      AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

    -- If at limit (6), pause the property
    IF v_app_count >= 6 THEN
      UPDATE properties
      SET on_market = FALSE
      WHERE id = NEW.property_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Fix auto_unpause_listing_below_limit (for marketplace_applications)
CREATE OR REPLACE FUNCTION auto_unpause_listing_below_limit()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = 'public'
LANGUAGE plpgsql
AS $$
DECLARE
  v_app_count INTEGER;
  v_unit_count INTEGER;
  v_property_id UUID;
BEGIN
  -- Only process if status changed to withdrawn/rejected/cancelled
  IF NEW.status IN ('withdrawn', 'rejected', 'cancelled') 
     AND OLD.status NOT IN ('withdrawn', 'rejected', 'cancelled') THEN
    
    -- Count remaining active applications for this unit
    SELECT COUNT(*) INTO v_app_count
    FROM marketplace_applications
    WHERE unit_id = NEW.unit_id
      AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

    -- If below limit (< 6), unpause the unit
    IF v_app_count < 6 THEN
      -- Get property_id and unit_count
      SELECT pu.property_id, p.unit_count INTO v_property_id, v_unit_count
      FROM property_units pu
      JOIN properties p ON p.id = pu.property_id
      WHERE pu.id = NEW.unit_id;

      -- Always unpause the unit
      UPDATE property_units
      SET on_market = TRUE
      WHERE id = NEW.unit_id;

      -- Only unpause property if single-family (unit_count = 1 or NULL)
      IF v_unit_count IS NULL OR v_unit_count <= 1 THEN
        UPDATE properties
        SET on_market = TRUE
        WHERE id = v_property_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Fix auto_unpause_property_below_limit (for property_applications)
CREATE OR REPLACE FUNCTION auto_unpause_property_below_limit()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = 'public'
LANGUAGE plpgsql
AS $$
DECLARE
  v_app_count INTEGER;
  v_unit_count INTEGER;
BEGIN
  -- Only process if status changed to withdrawn/rejected/cancelled
  IF NEW.status IN ('withdrawn', 'rejected', 'cancelled')
     AND OLD.status NOT IN ('withdrawn', 'rejected', 'cancelled') THEN

    -- Handle unit-level applications
    IF NEW.unit_id IS NOT NULL THEN
      -- Count remaining applications for this unit
      SELECT COUNT(*) INTO v_app_count
      FROM property_applications
      WHERE unit_id = NEW.unit_id
        AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

      -- If below limit (< 6), unpause the unit
      IF v_app_count < 6 THEN
        -- Get unit_count
        SELECT p.unit_count INTO v_unit_count
        FROM property_units pu
        JOIN properties p ON p.id = pu.property_id
        WHERE pu.id = NEW.unit_id;

        -- Always unpause the unit
        UPDATE property_units
        SET on_market = TRUE
        WHERE id = NEW.unit_id;

        -- Only unpause property if single-family (unit_count = 1 or NULL)
        IF v_unit_count IS NULL OR v_unit_count <= 1 THEN
          UPDATE properties
          SET on_market = TRUE
          WHERE id = (SELECT property_id FROM property_units WHERE id = NEW.unit_id);
        END IF;
      END IF;
    ELSE
      -- Handle property-level applications (unit_id IS NULL)
      SELECT COUNT(*) INTO v_app_count
      FROM property_applications
      WHERE property_id = NEW.property_id
        AND unit_id IS NULL
        AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

      -- If below limit (< 6), unpause the property
      IF v_app_count < 6 THEN
        UPDATE properties
        SET on_market = TRUE
        WHERE id = NEW.property_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. One-time fix: Restore on_market = TRUE for multi-unit properties that have at least one unit on market
UPDATE properties p
SET on_market = true
WHERE unit_count > 1
  AND on_market = false
  AND EXISTS (
    SELECT 1 FROM property_units pu
    WHERE pu.property_id = p.id
      AND pu.on_market = true
  );