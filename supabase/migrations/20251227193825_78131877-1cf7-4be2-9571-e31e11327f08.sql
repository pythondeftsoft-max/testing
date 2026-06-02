CREATE OR REPLACE FUNCTION public.landlord_set_primary_applicant(p_unit_id UUID, p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id UUID;
  v_landlord_id UUID;
  v_result JSON;
BEGIN
  -- Get property_id and owner_id from the unit
  SELECT pu.property_id, p.owner_id INTO v_property_id, v_landlord_id
  FROM property_units pu
  JOIN properties p ON p.id = pu.property_id
  WHERE pu.id = p_unit_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  IF v_landlord_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Clear existing primary on marketplace_applications (uses user_id)
  UPDATE marketplace_applications
  SET is_primary_applicant = false
  WHERE unit_id = p_unit_id AND is_primary_applicant = true;

  -- Clear existing primary on property_applications (uses tenant_id)
  UPDATE property_applications
  SET is_primary_applicant = false
  WHERE unit_id = p_unit_id AND is_primary_applicant = true;

  -- Clear property_applications with matching original_unit_id
  UPDATE property_applications
  SET is_primary_applicant = false
  WHERE property_id = v_property_id 
    AND unit_id IS NULL
    AND (application_data->>'original_unit_id')::UUID = p_unit_id
    AND is_primary_applicant = true;

  -- Set primary on marketplace_applications (uses user_id)
  UPDATE marketplace_applications
  SET is_primary_applicant = true, updated_at = NOW()
  WHERE unit_id = p_unit_id AND user_id = p_tenant_id;

  -- Set primary on property_applications (tenant_id is correct here)
  UPDATE property_applications
  SET is_primary_applicant = true, updated_at = NOW()
  WHERE unit_id = p_unit_id AND tenant_id = p_tenant_id;

  -- Set primary on property_applications (property-level)
  UPDATE property_applications
  SET is_primary_applicant = true, updated_at = NOW()
  WHERE property_id = v_property_id 
    AND tenant_id = p_tenant_id
    AND unit_id IS NULL
    AND (application_data->>'original_unit_id')::UUID = p_unit_id;

  -- Move unit to In Process pipeline stage (removed listing_status as column no longer exists)
  UPDATE property_units
  SET pipeline_stage = 'in_process', updated_at = NOW()
  WHERE id = p_unit_id;

  -- Return result
  v_result := json_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'user_id', p_tenant_id,
    'property_id', v_property_id
  );

  RETURN v_result;
END;
$$;