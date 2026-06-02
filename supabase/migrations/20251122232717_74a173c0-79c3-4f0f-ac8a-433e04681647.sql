-- Create landlord_set_primary_applicant RPC function
CREATE OR REPLACE FUNCTION landlord_set_primary_applicant(
  p_unit_id UUID,
  p_tenant_id UUID,
  p_landlord_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit RECORD;
  v_property RECORD;
  v_was_unassigned BOOLEAN;
  v_result JSON;
BEGIN
  -- Validate unit exists and belongs to landlord
  SELECT pu.*, pu.pipeline_stage, pu.assigned_worker_id
  INTO v_unit
  FROM property_units pu
  JOIN properties p ON p.id = pu.property_id
  WHERE pu.id = p_unit_id 
    AND p.owner_id = p_landlord_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found or access denied';
  END IF;

  -- Check if unit already has a different Primary
  IF v_unit.primary_applicant_tenant_id IS NOT NULL 
     AND v_unit.primary_applicant_tenant_id != p_tenant_id THEN
    RAISE EXCEPTION 'Unit already has a Primary Applicant. Must reject current Primary before selecting new one.';
  END IF;

  -- Validate tenant has an application for this unit
  IF NOT EXISTS (
    SELECT 1 FROM unit_applications 
    WHERE unit_id = p_unit_id 
      AND tenant_id = p_tenant_id
      AND status IN ('pending', 'under_review')
  ) THEN
    RAISE EXCEPTION 'Tenant has no active application for this unit';
  END IF;

  -- Track if unit was unassigned
  v_was_unassigned := (v_unit.pipeline_stage = 'unassigned' OR v_unit.assigned_worker_id IS NULL);

  -- Update property_units:
  -- 1. Set primary_applicant_tenant_id
  -- 2. Move to 'in_process' stage
  -- 3. Pause listing (set on_market = false for landlord units)
  UPDATE property_units
  SET 
    primary_applicant_tenant_id = p_tenant_id,
    pipeline_stage = 'in_process',
    on_market = false,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Update tenant's pipeline_stage to 'in_process'
  UPDATE profiles
  SET pipeline_stage = 'in_process',
      updated_at = NOW()
  WHERE id = p_tenant_id;

  -- Update application status
  UPDATE unit_applications
  SET status = 'primary_applicant',
      updated_at = NOW()
  WHERE unit_id = p_unit_id 
    AND tenant_id = p_tenant_id;

  -- Log the action
  INSERT INTO admin_action_logs (action, admin_user_id, resource_type, resource_id, details)
  VALUES (
    'set_primary_applicant',
    p_landlord_id,
    'unit',
    p_unit_id,
    jsonb_build_object(
      'tenant_id', p_tenant_id,
      'was_unassigned', v_was_unassigned
    )
  );

  -- Prepare result
  v_result := json_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'tenant_id', p_tenant_id,
    'new_stage', 'in_process'
  );

  RETURN v_result;
END;
$$;