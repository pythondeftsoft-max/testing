-- Auto-pause unit when application limit (6) is reached
CREATE OR REPLACE FUNCTION auto_pause_unit_on_application_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_active_count INTEGER;
  v_max_allowed INTEGER := 6;
BEGIN
  -- Only process for INSERT or status changes to active statuses
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status NOT IN ('withdrawn', 'rejected', 'cancelled')) THEN
    -- Count active applications for this unit
    SELECT COUNT(*) INTO v_active_count
    FROM property_applications
    WHERE unit_id = NEW.unit_id
      AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

    -- If at limit, pause the unit
    IF v_active_count >= v_max_allowed THEN
      UPDATE property_units
      SET on_market = false
      WHERE id = NEW.unit_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on property_applications for auto-pause
DROP TRIGGER IF EXISTS trigger_auto_pause_on_app_limit ON property_applications;
CREATE TRIGGER trigger_auto_pause_on_app_limit
AFTER INSERT OR UPDATE ON property_applications
FOR EACH ROW
EXECUTE FUNCTION auto_pause_unit_on_application_limit();

-- Auto-unpause unit when application count drops below limit and no primary applicant
CREATE OR REPLACE FUNCTION auto_unpause_unit_on_application_change()
RETURNS TRIGGER AS $$
DECLARE
  v_active_count INTEGER;
  v_has_primary BOOLEAN;
  v_max_allowed INTEGER := 6;
BEGIN
  -- Only process for withdrawals/rejections
  IF TG_OP = 'UPDATE' AND NEW.status IN ('withdrawn', 'rejected', 'cancelled') 
     AND OLD.status NOT IN ('withdrawn', 'rejected', 'cancelled') THEN
    
    -- Count remaining active applications
    SELECT COUNT(*) INTO v_active_count
    FROM property_applications
    WHERE unit_id = NEW.unit_id
      AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

    -- Check if there's a primary applicant
    SELECT EXISTS(
      SELECT 1 FROM property_applications
      WHERE unit_id = NEW.unit_id
        AND is_primary_applicant = true
        AND status NOT IN ('withdrawn', 'rejected', 'cancelled')
    ) INTO v_has_primary;

    -- If below limit AND no primary, unpause the unit
    IF v_active_count < v_max_allowed AND NOT v_has_primary THEN
      UPDATE property_units
      SET on_market = true
      WHERE id = NEW.unit_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on property_applications for auto-unpause
DROP TRIGGER IF EXISTS trigger_auto_unpause_on_app_change ON property_applications;
CREATE TRIGGER trigger_auto_unpause_on_app_change
AFTER UPDATE ON property_applications
FOR EACH ROW
EXECUTE FUNCTION auto_unpause_unit_on_application_change();

-- One-time fix: pause all units that already have 6+ active applications
UPDATE property_units pu
SET on_market = false
WHERE on_market = true
  AND (
    SELECT COUNT(*) 
    FROM property_applications pa
    WHERE pa.unit_id = pu.id
      AND pa.status NOT IN ('withdrawn', 'rejected', 'cancelled')
  ) >= 6;