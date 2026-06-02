-- Update landlord_set_primary_applicant to also handle property_applications table
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
  -- Get property_id and landlord_id from the unit
  SELECT pu.property_id, p.landlord_id INTO v_property_id, v_landlord_id
  FROM property_units pu
  JOIN properties p ON p.id = pu.property_id
  WHERE pu.id = p_unit_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Verify caller is the landlord
  IF v_landlord_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Clear any existing primary applicant on marketplace_applications for this unit
  UPDATE marketplace_applications
  SET is_primary_applicant = false
  WHERE unit_id = p_unit_id AND is_primary_applicant = true;

  -- Clear any existing primary applicant on property_applications for this unit (direct unit match)
  UPDATE property_applications
  SET is_primary_applicant = false
  WHERE unit_id = p_unit_id AND is_primary_applicant = true;

  -- Clear property_applications that have original_unit_id matching this unit
  UPDATE property_applications
  SET is_primary_applicant = false
  WHERE property_id = v_property_id 
    AND unit_id IS NULL
    AND (application_data->>'original_unit_id')::UUID = p_unit_id
    AND is_primary_applicant = true;

  -- Set primary on marketplace_applications
  UPDATE marketplace_applications
  SET 
    is_primary_applicant = true,
    updated_at = NOW()
  WHERE unit_id = p_unit_id 
    AND tenant_id = p_tenant_id;

  -- Set primary on property_applications (unit-level)
  UPDATE property_applications
  SET 
    is_primary_applicant = true,
    updated_at = NOW()
  WHERE unit_id = p_unit_id 
    AND tenant_id = p_tenant_id;

  -- Set primary on property_applications (property-level with original_unit_id)
  UPDATE property_applications
  SET 
    is_primary_applicant = true,
    updated_at = NOW()
  WHERE property_id = v_property_id 
    AND tenant_id = p_tenant_id
    AND unit_id IS NULL
    AND (application_data->>'original_unit_id')::UUID = p_unit_id;

  -- Pause the unit listing
  UPDATE property_units
  SET 
    listing_status = 'paused',
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Move unit to In Process pipeline stage
  UPDATE property_units
  SET 
    pipeline_stage = 'in_process',
    updated_at = NOW()
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