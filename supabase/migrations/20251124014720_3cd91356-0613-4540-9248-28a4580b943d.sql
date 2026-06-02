-- Fix landlord_set_primary_applicant to remove non-existent listing_status column
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
  v_result JSON;
BEGIN
  -- Get the property_id from the unit
  SELECT property_id INTO v_property_id
  FROM property_units
  WHERE id = p_unit_id;

  -- Check if there's already a primary applicant for this unit
  SELECT tenant_id INTO v_current_primary_id
  FROM unit_applications
  WHERE unit_id = p_unit_id 
    AND is_primary_applicant = true
  LIMIT 1;

  -- If there's a different primary applicant, clear them first
  IF v_current_primary_id IS NOT NULL AND v_current_primary_id != p_tenant_id THEN
    UPDATE unit_applications
    SET is_primary_applicant = false
    WHERE unit_id = p_unit_id AND tenant_id = v_current_primary_id;
    
    UPDATE marketplace_applications
    SET is_primary_applicant = false
    WHERE property_id = v_property_id AND user_id = v_current_primary_id;
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

  -- Update the unit status to in_process (removed listing_status as it doesn't exist)
  UPDATE property_units
  SET status = 'in_process'
  WHERE id = p_unit_id;

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