-- Drop the correct function signature based on error message
DROP FUNCTION IF EXISTS landlord_reject_primary_applicant(uuid, uuid, text);

CREATE OR REPLACE FUNCTION landlord_reject_primary_applicant(
  p_unit_id uuid DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'Not a fit'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_application_id uuid;
  v_property_id uuid;
BEGIN
  -- Validate that at least one identifier is provided
  IF p_unit_id IS NULL AND p_property_id IS NULL THEN
    RAISE EXCEPTION 'Either unit_id or property_id must be provided';
  END IF;

  -- Determine property_id and find the primary application
  IF p_unit_id IS NOT NULL THEN
    -- Find by unit_id
    SELECT id, property_id INTO v_application_id, v_property_id
    FROM marketplace_applications
    WHERE unit_id = p_unit_id
      AND is_primary_applicant = true
      AND status NOT IN ('rejected', 'withdrawn')
    LIMIT 1;
  ELSE
    -- Find by property_id
    SELECT id INTO v_application_id
    FROM marketplace_applications
    WHERE property_id = p_property_id
      AND is_primary_applicant = true
      AND status NOT IN ('rejected', 'withdrawn')
    LIMIT 1;
    
    v_property_id := p_property_id;
  END IF;

  -- If no primary applicant found, raise error
  IF v_application_id IS NULL THEN
    RAISE EXCEPTION 'No primary applicant found for the specified property/unit';
  END IF;

  -- Update the application status to rejected
  UPDATE marketplace_applications
  SET 
    status = 'rejected',
    is_primary_applicant = false,
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE id = v_application_id;

  -- Set property back on market
  UPDATE properties
  SET 
    on_market = true,
    updated_at = NOW()
  WHERE id = v_property_id;

  -- If specific unit was provided, set that unit back on market
  IF p_unit_id IS NOT NULL THEN
    UPDATE property_units
    SET 
      on_market = true,
      status = 'available',
      updated_at = NOW()
    WHERE id = p_unit_id;
  ELSE
    -- Set all units for this property back on market
    UPDATE property_units
    SET 
      on_market = true,
      status = 'available',
      updated_at = NOW()
    WHERE property_id = v_property_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'application_id', v_application_id,
    'property_id', v_property_id,
    'unit_id', p_unit_id
  );
END;
$$;