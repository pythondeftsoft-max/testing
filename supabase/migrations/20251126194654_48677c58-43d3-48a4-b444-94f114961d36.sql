-- Fix landlord_set_primary_applicant function to use correct notification column names
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
  SELECT pu.*, p.landlord_id, p.id as property_id
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
    -- Update the application status to rejected
    UPDATE unit_applications
    SET 
      status = 'rejected',
      rejection_reason = 'Landlord selected another applicant',
      updated_at = NOW()
    WHERE unit_id = p_unit_id 
      AND tenant_id = v_current_primary_id
      AND status = 'primary';

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

  -- Set the new primary applicant
  UPDATE property_units
  SET 
    primary_applicant_id = p_tenant_id,
    listing_status = 'in_process',
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Update the application status to primary
  UPDATE unit_applications
  SET 
    status = 'primary',
    updated_at = NOW()
  WHERE unit_id = p_unit_id 
    AND tenant_id = p_tenant_id;

  -- Reject all other pending applications for this unit
  UPDATE unit_applications
  SET 
    status = 'rejected',
    rejection_reason = 'Landlord selected another applicant',
    updated_at = NOW()
  WHERE unit_id = p_unit_id 
    AND tenant_id != p_tenant_id
    AND status IN ('pending', 'under_review');

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