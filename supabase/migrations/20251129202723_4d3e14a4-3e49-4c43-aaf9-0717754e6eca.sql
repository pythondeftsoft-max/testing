-- Fix landlord_set_primary_applicant to handle property-level applications and correct foreign key
-- Drop the existing function
DROP FUNCTION IF EXISTS landlord_set_primary_applicant(uuid, uuid);

-- Recreate with improved logic
CREATE OR REPLACE FUNCTION landlord_set_primary_applicant(
  p_unit_id UUID,
  p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id UUID;
  v_landlord_id UUID;
  v_current_user_id UUID;
  v_tenant_profile_id UUID;
  v_result JSON;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get property_id and verify ownership
  SELECT property_id INTO v_property_id
  FROM property_units
  WHERE id = p_unit_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  SELECT owner_id INTO v_landlord_id
  FROM properties
  WHERE id = v_property_id;

  IF v_landlord_id IS NULL OR v_landlord_id != v_current_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Look up the tenant_profiles.id from the user_id
  SELECT id INTO v_tenant_profile_id
  FROM tenant_profiles
  WHERE user_id = p_tenant_id;

  IF v_tenant_profile_id IS NULL THEN
    RAISE EXCEPTION 'Tenant profile not found for user';
  END IF;

  -- Clear any existing primary applicant for this unit
  UPDATE property_units
  SET primary_applicant_id = NULL
  WHERE id = p_unit_id;

  UPDATE marketplace_applications
  SET is_primary_applicant = false
  WHERE unit_id = p_unit_id AND is_primary_applicant = true;

  -- STEP 1: First, update unit_id on marketplace_applications if it's NULL (property-level application)
  UPDATE marketplace_applications
  SET 
    unit_id = p_unit_id,
    updated_at = NOW()
  WHERE property_id = v_property_id 
    AND user_id = p_tenant_id 
    AND unit_id IS NULL;

  -- STEP 2: Now set the new primary applicant using tenant_profiles.id
  UPDATE property_units
  SET primary_applicant_id = v_tenant_profile_id
  WHERE id = p_unit_id;

  UPDATE marketplace_applications
  SET 
    is_primary_applicant = true,
    updated_at = NOW()
  WHERE unit_id = p_unit_id 
    AND user_id = p_tenant_id;

  -- Pause the listing (set property status to in_process)
  UPDATE properties
  SET status = 'in_process'
  WHERE id = v_property_id;

  -- Return result
  SELECT json_build_object(
    'unit_id', p_unit_id,
    'user_id', p_tenant_id,
    'property_id', v_property_id
  ) INTO v_result;

  RETURN v_result;
END;
$$;