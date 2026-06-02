-- Fix auto_unpause_listing_below_limit function to use correct column and table names
CREATE OR REPLACE FUNCTION auto_unpause_listing_below_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Only run when status changes to withdrawn/rejected/cancelled
  IF NEW.status IN ('withdrawn', 'rejected', 'cancelled') THEN
    -- Count remaining active applications for this unit
    SELECT COUNT(*)
    INTO v_count
    FROM marketplace_applications
    WHERE unit_id = NEW.unit_id
      AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

    -- Only unpause if below limit AND no primary applicant exists
    IF v_count < 6 THEN
      IF NOT EXISTS (
        SELECT 1 
        FROM marketplace_applications 
        WHERE unit_id = NEW.unit_id 
          AND is_primary_applicant = TRUE 
          AND status NOT IN ('withdrawn', 'rejected', 'cancelled')
      ) THEN
        -- Unpause the unit
        UPDATE property_units 
        SET on_market = TRUE 
        WHERE id = NEW.unit_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;