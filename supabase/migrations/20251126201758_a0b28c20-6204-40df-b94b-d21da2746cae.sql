-- Fix landlord_set_primary_applicant to add pipeline_stage = 'in_process'
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
  v_tenant_profile_id UUID;
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

  -- Look up the tenant profile ID from the user_id
  SELECT id INTO v_tenant_profile_id
  FROM tenant_profiles
  WHERE user_id = p_tenant_id;

  IF v_tenant_profile_id IS NULL THEN
    RAISE EXCEPTION 'Tenant profile not found for user';
  END IF;

  -- Check if there's already a primary applicant
  SELECT primary_applicant_id INTO v_current_primary_id
  FROM property_units
  WHERE id = p_unit_id;

  -- If there's an existing primary applicant, reject them
  IF v_current_primary_id IS NOT NULL AND v_current_primary_id != v_tenant_profile_id THEN
    -- Get the user_id for the previous primary applicant
    DECLARE
      v_previous_user_id UUID;
    BEGIN
      SELECT user_id INTO v_previous_user_id
      FROM tenant_profiles
      WHERE id = v_current_primary_id;

      -- Update the marketplace application to not be primary anymore
      UPDATE marketplace_applications
      SET 
        is_primary_applicant = false,
        updated_at = NOW()
      WHERE unit_id = p_unit_id 
        AND user_id = v_previous_user_id
        AND is_primary_applicant = true;

      -- Delete any autopay schedules for the previous primary
      DELETE FROM autopay_schedules
      WHERE property_id = v_property_id
        AND tenant_id = v_previous_user_id;

      -- Send notification to the rejected applicant
      INSERT INTO notifications (user_id, type, title, description, metadata)
      VALUES (
        v_previous_user_id,
        'application_rejected',
        'Application Update',
        'Your primary applicant status has been changed. The landlord has selected another applicant.',
        jsonb_build_object('unit_id', p_unit_id, 'property_id', v_property_id)
      );
    END;
  END IF;

  -- Set the new primary applicant on the unit (using tenant_profile_id)
  UPDATE property_units
  SET 
    primary_applicant_id = v_tenant_profile_id,
    status = 'in_process',
    pipeline_stage = 'in_process',
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Set the marketplace application as primary (using user_id)
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

-- Fix landlord_reject_primary_applicant to use correct IDs and set pipeline_stage based on territory + worker
CREATE OR REPLACE FUNCTION landlord_reject_primary_applicant(
  p_unit_id UUID DEFAULT NULL,
  p_property_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Not a fit'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_landlord_id UUID;
  v_unit_id UUID;
  v_tenant_id UUID;
  v_user_id UUID;
  v_property_id UUID;
  v_new_pipeline_stage TEXT;
  v_assigned_worker_id UUID;
  v_territory_id UUID;
BEGIN
  -- Handle both unit-level and property-level rejection
  IF p_unit_id IS NOT NULL THEN
    v_unit_id := p_unit_id;
  ELSIF p_property_id IS NOT NULL THEN
    -- Get the first unit with a primary applicant for this property
    SELECT id INTO v_unit_id
    FROM property_units
    WHERE property_id = p_property_id
      AND primary_applicant_id IS NOT NULL
    LIMIT 1;
    
    IF v_unit_id IS NULL THEN
      RAISE EXCEPTION 'No primary applicant found for this property';
    END IF;
  ELSE
    RAISE EXCEPTION 'Either unit_id or property_id must be provided';
  END IF;

  -- Get unit details and verify ownership
  SELECT pu.primary_applicant_id, pu.property_id, p.owner_id, pu.assigned_worker_id, pu.territory_id
  INTO v_tenant_id, v_property_id, v_landlord_id, v_assigned_worker_id, v_territory_id
  FROM property_units pu
  JOIN properties p ON pu.property_id = p.id
  WHERE pu.id = v_unit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Verify the caller is the landlord
  IF auth.uid() != v_landlord_id THEN
    RAISE EXCEPTION 'Unauthorized: Only the landlord can reject primary applicant';
  END IF;

  -- Check if there's actually a primary applicant to reject
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No primary applicant found';
  END IF;

  -- Look up the user_id from tenant_profiles
  SELECT user_id INTO v_user_id
  FROM tenant_profiles
  WHERE id = v_tenant_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found for tenant profile';
  END IF;

  -- Determine pipeline_stage based on territory and worker assignment
  IF v_assigned_worker_id IS NOT NULL AND v_territory_id IS NOT NULL THEN
    v_new_pipeline_stage := 'assigned';
  ELSE
    v_new_pipeline_stage := 'unassigned';
  END IF;

  -- Clear the primary applicant from the unit
  UPDATE property_units
  SET 
    primary_applicant_id = NULL,
    status = 'available',
    pipeline_stage = v_new_pipeline_stage,
    updated_at = now()
  WHERE id = v_unit_id;

  -- Update the marketplace application
  UPDATE marketplace_applications
  SET 
    is_primary_applicant = false,
    status = 'rejected',
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE unit_id = v_unit_id 
    AND user_id = v_user_id;

  -- Delete any autopay schedules
  DELETE FROM autopay_schedules
  WHERE property_id = v_property_id
    AND tenant_id = v_user_id;

  -- Send notification to the rejected tenant
  INSERT INTO notifications (user_id, type, title, description, metadata)
  VALUES (
    v_user_id,
    'application_rejected',
    'Application Rejected',
    'Your application has been rejected by the landlord. Reason: ' || p_reason,
    jsonb_build_object('unit_id', v_unit_id, 'property_id', v_property_id, 'reason', p_reason)
  );

  -- Return the result
  RETURN json_build_object(
    'success', true,
    'unit_id', v_unit_id,
    'tenant_id', v_tenant_id,
    'property_id', v_property_id,
    'new_pipeline_stage', v_new_pipeline_stage
  );
END;
$$;