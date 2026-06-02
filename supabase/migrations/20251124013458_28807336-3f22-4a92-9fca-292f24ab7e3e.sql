-- Drop and recreate landlord_set_primary_applicant to fix is_primary_applicant in marketplace_applications
DROP FUNCTION IF EXISTS landlord_set_primary_applicant(UUID, UUID);

CREATE FUNCTION landlord_set_primary_applicant(
  p_unit_id UUID,
  p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_id UUID;
  v_landlord_id UUID;
  v_current_primary_id UUID;
  v_result JSON;
BEGIN
  -- Get property_id and landlord_id from the unit
  SELECT property_id INTO v_property_id
  FROM property_units
  WHERE id = p_unit_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  SELECT landlord_id INTO v_landlord_id
  FROM properties
  WHERE id = v_property_id;

  -- Check if there's already a primary applicant for this unit
  SELECT user_id INTO v_current_primary_id
  FROM unit_applications
  WHERE unit_id = p_unit_id
    AND is_primary_applicant = true;

  -- If there's a current primary applicant, deny them first
  IF v_current_primary_id IS NOT NULL AND v_current_primary_id != p_tenant_id THEN
    -- Update the old primary applicant
    UPDATE unit_applications
    SET 
      is_primary_applicant = false,
      application_status = 'denied',
      status_updated_at = NOW(),
      updated_at = NOW()
    WHERE unit_id = p_unit_id
      AND user_id = v_current_primary_id;

    -- Also update marketplace_applications for old primary
    UPDATE marketplace_applications
    SET 
      status = 'denied',
      is_primary_applicant = false,
      updated_at = NOW()
    WHERE user_id = v_current_primary_id
      AND property_id = v_property_id;
  END IF;

  -- Set the new primary applicant in unit_applications
  UPDATE unit_applications
  SET 
    is_primary_applicant = true,
    application_status = 'primary_applicant',
    status_updated_at = NOW(),
    updated_at = NOW()
  WHERE unit_id = p_unit_id
    AND user_id = p_tenant_id;

  -- CRITICAL FIX: Also set is_primary_applicant = true in marketplace_applications
  UPDATE marketplace_applications
  SET 
    status = 'primary_applicant',
    is_primary_applicant = true,
    updated_at = NOW()
  WHERE user_id = p_tenant_id
    AND property_id = v_property_id;

  -- Update the unit status to 'in_process' and pause the listing
  UPDATE property_units
  SET 
    status = 'in_process',
    is_paused = true,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Return the result
  SELECT json_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'user_id', p_tenant_id,
    'property_id', v_property_id
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Drop and recreate landlord_reject_primary_applicant to fix is_primary_applicant clearing
DROP FUNCTION IF EXISTS landlord_reject_primary_applicant(UUID, TEXT);

CREATE FUNCTION landlord_reject_primary_applicant(
  p_unit_id UUID,
  p_reason TEXT DEFAULT 'Not a fit'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_id UUID;
  v_tenant_id UUID;
  v_result JSON;
BEGIN
  -- Get property_id from the unit
  SELECT property_id INTO v_property_id
  FROM property_units
  WHERE id = p_unit_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Get the current primary applicant
  SELECT user_id INTO v_tenant_id
  FROM unit_applications
  WHERE unit_id = p_unit_id
    AND is_primary_applicant = true;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No primary applicant found for this unit';
  END IF;

  -- Update unit_applications
  UPDATE unit_applications
  SET 
    is_primary_applicant = false,
    application_status = 'denied',
    status_updated_at = NOW(),
    updated_at = NOW()
  WHERE unit_id = p_unit_id
    AND user_id = v_tenant_id;

  -- CRITICAL FIX: Also clear is_primary_applicant in marketplace_applications
  UPDATE marketplace_applications
  SET 
    status = 'denied',
    is_primary_applicant = false,
    updated_at = NOW()
  WHERE user_id = v_tenant_id
    AND property_id = v_property_id;

  -- Update the unit status back to 'available' and unpause the listing
  UPDATE property_units
  SET 
    status = 'available',
    is_paused = false,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Return the result
  SELECT json_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'user_id', v_tenant_id,
    'property_id', v_property_id
  ) INTO v_result;

  RETURN v_result;
END;
$$;