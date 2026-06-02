-- Drop existing functions to allow recreation with new return types
DROP FUNCTION IF EXISTS landlord_set_primary_applicant(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS landlord_reject_primary_applicant(UUID, UUID, TEXT);

-- Recreate landlord_set_primary_applicant with is_primary_applicant sync
CREATE OR REPLACE FUNCTION landlord_set_primary_applicant(
  p_unit_id UUID,
  p_tenant_id UUID,
  p_landlord_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unit RECORD;
  v_current_primary_id UUID;
  v_application_id UUID;
  v_result JSONB;
BEGIN
  -- Get the unit and verify landlord owns it
  SELECT pu.*, p.landlord_id
  INTO v_unit
  FROM property_units pu
  JOIN properties p ON p.id = pu.property_id
  WHERE pu.id = p_unit_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unit not found');
  END IF;

  IF v_unit.landlord_id != p_landlord_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get current primary if exists
  v_current_primary_id := v_unit.primary_applicant_tenant_id;

  -- Get the application ID
  SELECT id INTO v_application_id
  FROM marketplace_applications
  WHERE unit_id = p_unit_id AND user_id = p_tenant_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found');
  END IF;

  -- If there's already a primary and it's different, deny the old one
  IF v_current_primary_id IS NOT NULL AND v_current_primary_id != p_tenant_id THEN
    -- Update old primary's application status and clear primary flag
    UPDATE marketplace_applications
    SET 
      status = 'withdrawn',
      is_primary_applicant = FALSE,
      updated_at = NOW()
    WHERE unit_id = p_unit_id AND user_id = v_current_primary_id;

    -- Send notification to old primary
    INSERT INTO notifications (user_id, title, message, type, metadata)
    VALUES (
      v_current_primary_id,
      'Primary Applicant Status Changed',
      'The landlord has selected a different primary applicant for this unit.',
      'application_update',
      jsonb_build_object('unit_id', p_unit_id, 'reason', 'primary_changed')
    );
  END IF;

  -- Set the new primary applicant in property_units
  UPDATE property_units
  SET 
    primary_applicant_tenant_id = p_tenant_id,
    pipeline_stage = 'in_process',
    on_market = FALSE,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Update the application to mark as primary
  UPDATE marketplace_applications
  SET 
    is_primary_applicant = TRUE,
    status = 'approved',
    updated_at = NOW()
  WHERE id = v_application_id;

  -- Remove message limits for the primary applicant
  UPDATE message_limits
  SET 
    messages_remaining = 999,
    updated_at = NOW()
  WHERE user_id = p_tenant_id AND property_id = v_unit.property_id;

  -- Send notification to new primary
  INSERT INTO notifications (user_id, title, message, type, metadata)
  VALUES (
    p_tenant_id,
    'You Are Now the Primary Applicant',
    'Congratulations! The landlord has selected you as the primary applicant.',
    'application_update',
    jsonb_build_object('unit_id', p_unit_id, 'application_id', v_application_id)
  );

  v_result := jsonb_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'tenant_id', p_tenant_id,
    'application_id', v_application_id,
    'previous_primary_id', v_current_primary_id
  );

  RETURN v_result;
END;
$$;

-- Recreate landlord_reject_primary_applicant with is_primary_applicant sync
CREATE OR REPLACE FUNCTION landlord_reject_primary_applicant(
  p_unit_id UUID,
  p_landlord_id UUID,
  p_reason TEXT DEFAULT 'Not a fit'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unit RECORD;
  v_primary_tenant_id UUID;
  v_application_count INT;
  v_should_unpause BOOLEAN;
  v_result JSONB;
BEGIN
  -- Get the unit and verify landlord owns it
  SELECT pu.*, p.landlord_id
  INTO v_unit
  FROM property_units pu
  JOIN properties p ON p.id = pu.property_id
  WHERE pu.id = p_unit_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unit not found');
  END IF;

  IF v_unit.landlord_id != p_landlord_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get the current primary tenant
  v_primary_tenant_id := v_unit.primary_applicant_tenant_id;

  IF v_primary_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No primary applicant to reject');
  END IF;

  -- Update the primary applicant's application status and clear primary flag
  UPDATE marketplace_applications
  SET 
    status = 'withdrawn',
    is_primary_applicant = FALSE,
    updated_at = NOW()
  WHERE unit_id = p_unit_id AND user_id = v_primary_tenant_id;

  -- Count remaining applications for this unit
  SELECT COUNT(*)
  INTO v_application_count
  FROM marketplace_applications
  WHERE unit_id = p_unit_id 
    AND status NOT IN ('withdrawn', 'rejected');

  -- Determine if we should unpause (only if < 6 apps and no primary)
  v_should_unpause := (v_application_count < 6);

  -- Clear the primary applicant and update unit state
  UPDATE property_units
  SET 
    primary_applicant_tenant_id = NULL,
    pipeline_stage = 'assigned',
    on_market = v_should_unpause,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Send notification to rejected primary
  INSERT INTO notifications (user_id, title, message, type, metadata)
  VALUES (
    v_primary_tenant_id,
    'Primary Applicant Status Removed',
    'The landlord has decided to move forward with a different applicant. Reason: ' || p_reason,
    'application_update',
    jsonb_build_object('unit_id', p_unit_id, 'reason', p_reason)
  );

  v_result := jsonb_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'rejected_tenant_id', v_primary_tenant_id,
    'reason', p_reason,
    'listing_unpaused', v_should_unpause,
    'remaining_applications', v_application_count
  );

  RETURN v_result;
END;
$$;