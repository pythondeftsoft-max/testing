-- Update landlord_set_primary_applicant to auto-create tenant_profiles
CREATE OR REPLACE FUNCTION landlord_set_primary_applicant(
  p_application_id UUID,
  p_tenant_id UUID,
  p_property_id UUID,
  p_unit_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_landlord_id UUID;
  v_result JSONB;
BEGIN
  -- Get the authenticated user's ID
  v_landlord_id := auth.uid();
  
  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the landlord owns this property
  IF NOT EXISTS (
    SELECT 1 FROM properties 
    WHERE id = p_property_id 
    AND landlord_id = v_landlord_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this property';
  END IF;

  -- Ensure tenant_profiles record exists (required for foreign key)
  INSERT INTO tenant_profiles (id, user_id)
  VALUES (p_tenant_id, p_tenant_id)
  ON CONFLICT (id) DO NOTHING;

  -- Create or update unit_applications record
  INSERT INTO unit_applications (
    tenant_id,
    unit_id,
    application_status,
    application_date,
    move_in_date
  )
  VALUES (
    p_tenant_id,
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
  AND primary_applicant_id != p_tenant_id;

  -- Set the new primary applicant and update property_units
  UPDATE property_units
  SET 
    primary_applicant_id = p_tenant_id,
    occupancy_status = 'in_process',
    on_market = FALSE,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Update the marketplace application status
  UPDATE marketplace_applications
  SET 
    application_status = 'primary_applicant',
    updated_at = NOW()
  WHERE id = p_application_id;

  -- Return success with details
  v_result := jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'tenant_id', p_tenant_id,
    'unit_id', p_unit_id,
    'property_id', p_property_id
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error setting primary applicant: %', SQLERRM;
END;
$$;