-- Fix auto_pause_listing_at_limit to handle property-level applications
CREATE OR REPLACE FUNCTION auto_pause_listing_at_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_app_count INTEGER;
  v_unit_count INTEGER;
  v_property_id UUID;
  v_unit_id UUID;
BEGIN
  -- Handle unit-level applications
  IF NEW.unit_id IS NOT NULL THEN
    -- Count current applications for this unit
    SELECT COUNT(*) INTO v_app_count
    FROM marketplace_applications
    WHERE unit_id = NEW.unit_id
      AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

    IF v_app_count >= 6 THEN
      SELECT pu.property_id, p.unit_count INTO v_property_id, v_unit_count
      FROM property_units pu
      JOIN properties p ON p.id = pu.property_id
      WHERE pu.id = NEW.unit_id;

      UPDATE property_units SET on_market = FALSE WHERE id = NEW.unit_id;

      IF v_unit_count IS NULL OR v_unit_count <= 1 THEN
        UPDATE properties SET on_market = FALSE WHERE id = v_property_id;
      END IF;
    END IF;
    
  -- Handle property-level applications (unit_id IS NULL)
  ELSE
    -- Count property-level apps
    SELECT COUNT(*) INTO v_app_count
    FROM marketplace_applications
    WHERE property_id = NEW.property_id
      AND unit_id IS NULL
      AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

    IF v_app_count >= 6 THEN
      -- Get unit_count
      SELECT unit_count INTO v_unit_count FROM properties WHERE id = NEW.property_id;

      -- Pause the property
      UPDATE properties SET on_market = FALSE WHERE id = NEW.property_id;

      -- For single-family, also pause the unit
      IF v_unit_count IS NULL OR v_unit_count <= 1 THEN
        UPDATE property_units SET on_market = FALSE WHERE property_id = NEW.property_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix auto_unpause_listing_below_limit to handle property-level applications
CREATE OR REPLACE FUNCTION auto_unpause_listing_below_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
  v_unit_count INTEGER;
BEGIN
  IF NEW.status IN ('withdrawn', 'rejected', 'cancelled') THEN
    
    -- Handle unit-level applications
    IF NEW.unit_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_count
      FROM marketplace_applications
      WHERE unit_id = NEW.unit_id
        AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

      IF v_count < 6 THEN
        IF NOT EXISTS (
          SELECT 1 FROM marketplace_applications 
          WHERE unit_id = NEW.unit_id 
            AND is_primary_applicant = TRUE 
            AND status NOT IN ('withdrawn', 'rejected', 'cancelled')
        ) THEN
          -- Get unit_count
          SELECT p.unit_count INTO v_unit_count
          FROM property_units pu
          JOIN properties p ON p.id = pu.property_id
          WHERE pu.id = NEW.unit_id;
          
          -- Unpause the unit
          UPDATE property_units SET on_market = TRUE WHERE id = NEW.unit_id;
          
          -- For single-family, also unpause property
          IF v_unit_count IS NULL OR v_unit_count <= 1 THEN
            UPDATE properties SET on_market = TRUE 
            WHERE id = (SELECT property_id FROM property_units WHERE id = NEW.unit_id);
          END IF;
        END IF;
      END IF;
      
    -- Handle property-level applications (unit_id IS NULL)
    ELSE
      SELECT COUNT(*) INTO v_count
      FROM marketplace_applications
      WHERE property_id = NEW.property_id
        AND unit_id IS NULL
        AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

      IF v_count < 6 THEN
        IF NOT EXISTS (
          SELECT 1 FROM marketplace_applications 
          WHERE property_id = NEW.property_id
            AND unit_id IS NULL
            AND is_primary_applicant = TRUE 
            AND status NOT IN ('withdrawn', 'rejected', 'cancelled')
        ) THEN
          -- Get unit_count
          SELECT unit_count INTO v_unit_count FROM properties WHERE id = NEW.property_id;
          
          -- Unpause the property
          UPDATE properties SET on_market = TRUE WHERE id = NEW.property_id;
          
          -- For single-family, also unpause the unit
          IF v_unit_count IS NULL OR v_unit_count <= 1 THEN
            UPDATE property_units SET on_market = TRUE WHERE property_id = NEW.property_id;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 5194 Coney Island Avenue data (sync unit to match property off-market status)
UPDATE property_units 
SET on_market = FALSE, updated_at = NOW()
WHERE property_id = '8c3bedb5-8058-42b2-b0b6-4e08579f0391';