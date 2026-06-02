-- Update landlord_set_primary_applicant to also set pipeline_stage
DROP FUNCTION IF EXISTS landlord_set_primary_applicant(UUID, UUID);

CREATE OR REPLACE FUNCTION landlord_set_primary_applicant(
  p_unit_id UUID,
  p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_id UUID;
  v_current_primary_id UUID;
  v_unit_count INTEGER;
  v_result JSON;
BEGIN
  -- Get the property_id and unit_count from the unit
  SELECT property_id INTO v_property_id
  FROM property_units
  WHERE id = p_unit_id;

  SELECT unit_count INTO v_unit_count
  FROM properties
  WHERE id = v_property_id;

  -- Check if there's already a primary applicant for this unit
  SELECT tenant_id INTO v_current_primary_id
  FROM unit_applications
  WHERE unit_id = p_unit_id 
    AND is_primary_applicant = true
  LIMIT 1;

  -- If there's a different primary applicant, reject them
  IF v_current_primary_id IS NOT NULL AND v_current_primary_id != p_tenant_id THEN
    -- Reject in unit_applications
    UPDATE unit_applications
    SET 
      is_primary_applicant = false,
      status = 'rejected',
      rejected_by = 'landlord',
      rejection_reason = 'Replaced by another primary applicant'
    WHERE unit_id = p_unit_id AND tenant_id = v_current_primary_id;
    
    -- Reject in marketplace_applications
    UPDATE marketplace_applications
    SET 
      is_primary_applicant = false,
      status = 'rejected'
    WHERE property_id = v_property_id AND user_id = v_current_primary_id;

    -- Send notification to rejected applicant
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      v_current_primary_id,
      'application_rejected',
      'Application Update',
      'Your primary applicant status has been changed. The landlord has selected another applicant.',
      jsonb_build_object('unit_id', p_unit_id, 'property_id', v_property_id)
    );

    -- Block messaging for rejected primary
    UPDATE message_limits
    SET conversation_blocked = true
    WHERE user_id = v_current_primary_id AND unit_id = p_unit_id;
  END IF;

  -- Set the new primary applicant in unit_applications
  UPDATE unit_applications
  SET 
    is_primary_applicant = true,
    status = 'approved'
  WHERE unit_id = p_unit_id AND tenant_id = p_tenant_id;

  -- Set the new primary applicant in marketplace_applications
  UPDATE marketplace_applications
  SET is_primary_applicant = true
  WHERE property_id = v_property_id AND user_id = p_tenant_id;

  -- Update the unit status to in_process, set pipeline_stage, and set on_market to false
  UPDATE property_units
  SET 
    status = 'in_process',
    pipeline_stage = 'in_process',
    on_market = false
  WHERE id = p_unit_id;

  -- For single-family properties (unit_count = 1), also pause the property listing
  IF v_unit_count = 1 THEN
    UPDATE properties
    SET on_market = false
    WHERE id = v_property_id;
  END IF;

  -- Return result
  v_result := json_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'user_id', p_tenant_id,
    'message', 'Primary applicant set successfully'
  );

  RETURN v_result;
END;
$$;