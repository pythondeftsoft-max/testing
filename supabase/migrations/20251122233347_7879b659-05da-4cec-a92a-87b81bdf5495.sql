-- Create admin_push_to_in_process RPC function
CREATE OR REPLACE FUNCTION admin_push_to_in_process(
  p_unit_id UUID,
  p_admin_id UUID,
  p_reason TEXT DEFAULT 'Admin override'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit RECORD;
  v_result JSON;
BEGIN
  -- Validate admin permissions (check if user has admin role)
  IF NOT EXISTS (
    SELECT 1 FROM account_roles
    WHERE user_id = p_admin_id
      AND role_name = 'admin'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get unit details
  SELECT * INTO v_unit
  FROM property_units
  WHERE id = p_unit_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Update unit to in_process stage and pause listing
  UPDATE property_units
  SET 
    pipeline_stage = 'in_process',
    on_market = false,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Log the admin action
  INSERT INTO admin_action_logs (action, admin_user_id, resource_type, resource_id, details, reason)
  VALUES (
    'push_to_in_process',
    p_admin_id,
    'unit',
    p_unit_id,
    jsonb_build_object(
      'previous_stage', v_unit.pipeline_stage,
      'new_stage', 'in_process',
      'listing_paused', true
    ),
    p_reason
  );

  -- Prepare result
  v_result := json_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'previous_stage', v_unit.pipeline_stage,
    'new_stage', 'in_process',
    'listing_active', false
  );

  RETURN v_result;
END;
$$;

-- Create admin_reject_from_in_process RPC function
CREATE OR REPLACE FUNCTION admin_reject_from_in_process(
  p_unit_id UUID,
  p_admin_id UUID,
  p_reason TEXT DEFAULT 'Returned to previous stage'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit RECORD;
  v_return_to_stage TEXT;
  v_result JSON;
BEGIN
  -- Validate admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM account_roles
    WHERE user_id = p_admin_id
      AND role_name = 'admin'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get unit details
  SELECT * INTO v_unit
  FROM property_units
  WHERE id = p_unit_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Validate unit is in in_process stage
  IF v_unit.pipeline_stage != 'in_process' THEN
    RAISE EXCEPTION 'Unit is not in "In Process" stage';
  END IF;

  -- Determine return stage based on worker assignment
  IF v_unit.assigned_worker_id IS NOT NULL THEN
    v_return_to_stage := 'available';
  ELSE
    v_return_to_stage := 'unassigned';
  END IF;

  -- Update unit back to previous stage and resume listing
  UPDATE property_units
  SET 
    pipeline_stage = v_return_to_stage,
    on_market = true,
    primary_applicant_tenant_id = NULL,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- If there was a primary applicant, update their status
  IF v_unit.primary_applicant_tenant_id IS NOT NULL THEN
    UPDATE profiles
    SET 
      pipeline_stage = CASE 
        WHEN EXISTS (
          SELECT 1 FROM unit_applications ua
          JOIN property_units pu ON pu.id = ua.unit_id
          WHERE ua.tenant_id = v_unit.primary_applicant_tenant_id
            AND ua.status IN ('pending', 'under_review')
            AND pu.assigned_worker_id IS NOT NULL
        ) THEN 'assigned'
        ELSE 'unassigned'
      END,
      updated_at = NOW()
    WHERE id = v_unit.primary_applicant_tenant_id;
  END IF;

  -- Log the admin action
  INSERT INTO admin_action_logs (action, admin_user_id, resource_type, resource_id, details, reason)
  VALUES (
    'reject_from_in_process',
    p_admin_id,
    'unit',
    p_unit_id,
    jsonb_build_object(
      'previous_stage', 'in_process',
      'new_stage', v_return_to_stage,
      'primary_applicant_cleared', v_unit.primary_applicant_tenant_id IS NOT NULL,
      'listing_resumed', true
    ),
    p_reason
  );

  -- Prepare result
  v_result := json_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'previous_stage', 'in_process',
    'new_stage', v_return_to_stage,
    'listing_active', true
  );

  RETURN v_result;
END;
$$;