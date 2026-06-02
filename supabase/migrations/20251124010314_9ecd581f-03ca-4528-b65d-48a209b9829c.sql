-- Fix column name: landlord_id should be owner_id
CREATE OR REPLACE FUNCTION landlord_set_primary_applicant(
  p_unit_id UUID,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_landlord_id UUID;
  v_property_id UUID;
  v_result JSONB;
  v_tenant_profile_id UUID;
BEGIN
  -- Get the authenticated user's ID
  v_landlord_id := auth.uid();
  
  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the property_id for this unit and verify ownership
  SELECT property_id INTO v_property_id
  FROM property_units
  WHERE id = p_unit_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Verify the landlord owns this property (FIXED: owner_id not landlord_id)
  IF NOT EXISTS (
    SELECT 1 FROM properties 
    WHERE id = v_property_id 
    AND owner_id = v_landlord_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this property';
  END IF;

  -- Ensure tenant_profiles record exists (p_tenant_id is the user_id)
  INSERT INTO tenant_profiles (id, user_id)
  VALUES (p_tenant_id, p_tenant_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get the actual tenant_profiles.id (might be different from user_id)
  SELECT id INTO v_tenant_profile_id
  FROM tenant_profiles
  WHERE user_id = p_tenant_id;

  IF v_tenant_profile_id IS NULL THEN
    RAISE EXCEPTION 'Failed to get or create tenant profile';
  END IF;

  -- Create or update unit_applications record using tenant_profiles.id
  INSERT INTO unit_applications (
    tenant_id,
    unit_id,
    application_status,
    application_date,
    move_in_date
  )
  VALUES (
    v_tenant_profile_id,
    p_unit_id,
    'approved',
    NOW(),
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT (tenant_id, unit_id) 
  DO UPDATE SET
    application_status = 'approved',
    updated_at = NOW();

  -- Clear any existing primary applicant for this unit
  UPDATE property_units
  SET 
    primary_applicant_id = NULL,
    updated_at = NOW()
  WHERE id = p_unit_id
  AND primary_applicant_id IS NOT NULL
  AND primary_applicant_id != v_tenant_profile_id;

  -- Set the new primary applicant using tenant_profiles.id
  UPDATE property_units
  SET 
    primary_applicant_id = v_tenant_profile_id,
    occupancy_status = 'in_process',
    on_market = FALSE,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Update the marketplace application status using user_id
  UPDATE marketplace_applications
  SET 
    application_status = 'primary_applicant',
    updated_at = NOW()
  WHERE user_id = p_tenant_id
  AND property_id = v_property_id;

  -- Return success with details
  v_result := jsonb_build_object(
    'success', true,
    'tenant_profile_id', v_tenant_profile_id,
    'user_id', p_tenant_id,
    'unit_id', p_unit_id,
    'property_id', v_property_id
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error setting primary applicant: %', SQLERRM;
END;
$$;