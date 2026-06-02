-- Fix landlord_set_primary_applicant to handle missing unit_applications records
DROP FUNCTION IF EXISTS landlord_set_primary_applicant(UUID, UUID);

CREATE OR REPLACE FUNCTION landlord_set_primary_applicant(
  p_unit_id UUID,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_id UUID;
  v_owner_id UUID;
  v_current_user_id UUID;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get property_id and verify ownership
  SELECT p.id, p.owner_id INTO v_property_id, v_owner_id
  FROM properties p
  INNER JOIN property_units pu ON pu.property_id = p.id
  WHERE pu.id = p_unit_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  IF v_owner_id != v_current_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Ensure unit_applications record exists (create if missing)
  INSERT INTO unit_applications (unit_id, tenant_id, status, created_at, updated_at)
  SELECT p_unit_id, p_tenant_id, 'submitted', NOW(), NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM unit_applications 
    WHERE unit_id = p_unit_id AND tenant_id = p_tenant_id
  );

  -- Clear any existing primary applicant for this unit
  UPDATE unit_applications
  SET is_primary_applicant = FALSE,
      updated_at = NOW()
  WHERE unit_id = p_unit_id 
    AND is_primary_applicant = TRUE
    AND tenant_id != p_tenant_id;

  -- Set new primary applicant
  UPDATE unit_applications
  SET is_primary_applicant = TRUE,
      status = 'primary_applicant',
      updated_at = NOW()
  WHERE unit_id = p_unit_id 
    AND tenant_id = p_tenant_id;

  -- Update unit status
  UPDATE property_units
  SET status = 'in_process',
      primary_applicant_id = p_tenant_id,
      updated_at = NOW()
  WHERE id = p_unit_id;

  RETURN jsonb_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'tenant_id', p_tenant_id
  );
END;
$$;