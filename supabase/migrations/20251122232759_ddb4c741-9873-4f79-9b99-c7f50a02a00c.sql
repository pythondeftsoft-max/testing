-- Create landlord_reject_primary_applicant RPC function
CREATE OR REPLACE FUNCTION landlord_reject_primary_applicant(
  p_unit_id UUID,
  p_landlord_id UUID,
  p_reason TEXT DEFAULT 'Not a fit'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit RECORD;
  v_tenant_id UUID;
  v_return_to_stage TEXT;
  v_result JSON;
BEGIN
  -- Validate unit exists and belongs to landlord
  SELECT pu.*, pu.primary_applicant_tenant_id, pu.assigned_worker_id
  INTO v_unit
  FROM property_units pu
  JOIN properties p ON p.id = pu.property_id
  WHERE pu.id = p_unit_id 
    AND p.owner_id = p_landlord_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found or access denied';
  END IF;

  -- Validate unit has a Primary
  IF v_unit.primary_applicant_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Unit does not have a Primary Applicant to reject';
  END IF;

  v_tenant_id := v_unit.primary_applicant_tenant_id;

  -- Determine return stage based on whether unit has worker assignment
  IF v_unit.assigned_worker_id IS NOT NULL THEN
    v_return_to_stage := 'available';  -- Has worker, return to assigned/available
  ELSE
    v_return_to_stage := 'unassigned';  -- No worker, return to unassigned
  END IF;

  -- Update property_units:
  -- 1. Clear primary_applicant_tenant_id
  -- 2. Return to previous pipeline stage
  -- 3. Unpause listing (set on_market = true)
  UPDATE property_units
  SET 
    primary_applicant_tenant_id = NULL,
    pipeline_stage = v_return_to_stage,
    on_market = true,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Update tenant's pipeline_stage back to assigned or unassigned
  UPDATE profiles
  SET 
    pipeline_stage = CASE 
      WHEN EXISTS (
        SELECT 1 FROM unit_applications ua
        JOIN property_units pu ON pu.id = ua.unit_id
        WHERE ua.tenant_id = v_tenant_id
          AND ua.status IN ('pending', 'under_review')
          AND pu.assigned_worker_id IS NOT NULL
      ) THEN 'assigned'
      ELSE 'unassigned'
    END,
    updated_at = NOW()
  WHERE id = v_tenant_id;

  -- Update application status to rejected
  UPDATE unit_applications
  SET 
    status = 'rejected',
    updated_at = NOW()
  WHERE unit_id = p_unit_id 
    AND tenant_id = v_tenant_id;

  -- Log the action
  INSERT INTO admin_action_logs (action, admin_user_id, resource_type, resource_id, details, reason)
  VALUES (
    'reject_primary_applicant',
    p_landlord_id,
    'unit',
    p_unit_id,
    jsonb_build_object(
      'tenant_id', v_tenant_id,
      'returned_to_stage', v_return_to_stage
    ),
    p_reason
  );

  -- Prepare result
  v_result := json_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'tenant_id', v_tenant_id,
    'new_stage', v_return_to_stage,
    'listing_active', true
  );

  RETURN v_result;
END;
$$;