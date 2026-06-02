-- Fix landlord_set_primary_applicant to use marketplace_applications instead of unit_applications
CREATE OR REPLACE FUNCTION landlord_set_primary_applicant(
  p_unit_id UUID,
  p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_landlord_id UUID;
  v_property_id UUID;
  v_current_primary_id UUID;
  v_unit_record RECORD;
BEGIN
  -- Get the unit details and verify landlord ownership
  SELECT pu.*, p.owner_id as landlord_id, p.id as property_id
  INTO v_unit_record
  FROM property_units pu
  JOIN properties p ON pu.property_id = p.id
  WHERE pu.id = p_unit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  v_landlord_id := v_unit_record.landlord_id;
  v_property_id := v_unit_record.property_id;

  -- Verify the caller is the landlord
  IF auth.uid() != v_landlord_id THEN
    RAISE EXCEPTION 'Unauthorized: Only the landlord can set primary applicant';
  END IF;

  -- Check if there's already a primary applicant
  SELECT primary_applicant_id INTO v_current_primary_id
  FROM property_units
  WHERE id = p_unit_id;

  -- If there's an existing primary applicant, reject them
  IF v_current_primary_id IS NOT NULL AND v_current_primary_id != p_tenant_id THEN
    -- Update the marketplace application to not be primary anymore
    UPDATE marketplace_applications
    SET 
      is_primary_applicant = false,
      updated_at = NOW()
    WHERE unit_id = p_unit_id 
      AND user_id = v_current_primary_id
      AND is_primary_applicant = true;

    -- Delete any autopay schedules for the previous primary
    DELETE FROM autopay_schedules
    WHERE property_id = v_property_id
      AND tenant_id = v_current_primary_id;

    -- Send notification to the rejected applicant
    INSERT INTO notifications (user_id, type, title, description, metadata)
    VALUES (
      v_current_primary_id,
      'application_rejected',
      'Application Update',
      'Your primary applicant status has been changed. The landlord has selected another applicant.',
      jsonb_build_object('unit_id', p_unit_id, 'property_id', v_property_id)
    );
  END IF;

  -- Set the new primary applicant on the unit
  UPDATE property_units
  SET 
    primary_applicant_id = p_tenant_id,
    status = 'in_process',
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Set the marketplace application as primary
  UPDATE marketplace_applications
  SET 
    is_primary_applicant = true,
    updated_at = NOW()
  WHERE unit_id = p_unit_id 
    AND user_id = p_tenant_id;

  -- Set all other applications for this unit to not be primary
  UPDATE marketplace_applications
  SET 
    is_primary_applicant = false,
    updated_at = NOW()
  WHERE unit_id = p_unit_id 
    AND user_id != p_tenant_id
    AND is_primary_applicant = true;

  -- Send notification to the new primary applicant
  INSERT INTO notifications (user_id, type, title, description, metadata)
  VALUES (
    p_tenant_id,
    'application_approved',
    'Primary Applicant Selected',
    'Congratulations! You have been selected as the primary applicant for this property.',
    jsonb_build_object('unit_id', p_unit_id, 'property_id', v_property_id)
  );

  -- Return the result
  RETURN json_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'user_id', p_tenant_id,
    'property_id', v_property_id
  );
END;
$$;