-- Drop the existing function
DROP FUNCTION IF EXISTS landlord_reject_primary_applicant(uuid, uuid, text);

-- Recreate with the fix: use user_id instead of tenant_id for marketplace_applications
CREATE OR REPLACE FUNCTION landlord_reject_primary_applicant(
  p_unit_id uuid DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'Not a fit'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unit_id uuid;
  v_property_id uuid;
  v_tenant_id uuid;
  v_result jsonb;
BEGIN
  -- Determine unit_id and property_id
  IF p_unit_id IS NOT NULL THEN
    v_unit_id := p_unit_id;
    SELECT property_id INTO v_property_id FROM property_units WHERE id = v_unit_id;
  ELSIF p_property_id IS NOT NULL THEN
    v_property_id := p_property_id;
    SELECT id INTO v_unit_id FROM property_units 
    WHERE property_id = v_property_id 
    AND primary_applicant_id IS NOT NULL
    LIMIT 1;
  ELSE
    RAISE EXCEPTION 'Either unit_id or property_id must be provided';
  END IF;

  -- Get the primary applicant
  SELECT primary_applicant_id INTO v_tenant_id 
  FROM property_units 
  WHERE id = v_unit_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No primary applicant found for this unit';
  END IF;

  -- Clear primary applicant from unit
  UPDATE property_units
  SET 
    primary_applicant_id = NULL,
    pipeline_stage = 'available',
    updated_at = now()
  WHERE id = v_unit_id;

  -- Update property_applications status to withdrawn
  UPDATE property_applications
  SET status = 'withdrawn', updated_at = now()
  WHERE tenant_id = v_tenant_id
  AND property_id = v_property_id
  AND status != 'withdrawn';

  -- Update marketplace_applications status to withdrawn (FIXED: use user_id instead of tenant_id)
  UPDATE marketplace_applications
  SET status = 'withdrawn', updated_at = now()
  WHERE user_id = v_tenant_id
  AND property_id = v_property_id
  AND status != 'withdrawn';

  -- Reset tenant pipeline stage
  UPDATE profiles
  SET 
    pipeline_stage = 'seeking',
    updated_at = now()
  WHERE id = v_tenant_id;

  -- Log the action
  INSERT INTO admin_action_logs (
    admin_user_id,
    action,
    resource_type,
    resource_id,
    reason,
    details
  ) VALUES (
    auth.uid(),
    'reject_primary_applicant',
    'unit',
    v_unit_id,
    p_reason,
    jsonb_build_object(
      'tenant_id', v_tenant_id,
      'unit_id', v_unit_id,
      'property_id', v_property_id
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'unit_id', v_unit_id,
    'property_id', v_property_id,
    'tenant_id', v_tenant_id
  );

  RETURN v_result;
END;
$$;