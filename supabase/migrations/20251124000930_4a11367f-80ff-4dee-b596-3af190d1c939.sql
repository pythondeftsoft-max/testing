-- Drop existing functions
DROP FUNCTION IF EXISTS public.landlord_set_primary_applicant(UUID, UUID);
DROP FUNCTION IF EXISTS public.landlord_reject_primary_applicant(UUID, TEXT);

-- Recreate landlord_set_primary_applicant with search_path security
CREATE OR REPLACE FUNCTION public.landlord_set_primary_applicant(
  p_unit_id UUID,
  p_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id UUID;
  v_landlord_id UUID;
  v_current_user_id UUID;
  v_old_primary_tenant_id UUID;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get property and landlord info
  SELECT p.id, p.landlord_id INTO v_property_id, v_landlord_id
  FROM property_units pu
  JOIN properties p ON pu.property_id = p.id
  WHERE pu.id = p_unit_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Verify landlord owns this property
  IF v_landlord_id != v_current_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get the current primary applicant if any
  SELECT tenant_id INTO v_old_primary_tenant_id
  FROM unit_applications
  WHERE unit_id = p_unit_id 
    AND application_status = 'primary_applicant'
  LIMIT 1;

  -- If there's an old primary, set them to denied
  IF v_old_primary_tenant_id IS NOT NULL AND v_old_primary_tenant_id != p_tenant_id THEN
    UPDATE unit_applications
    SET 
      application_status = 'denied',
      status_updated_at = NOW(),
      is_primary_applicant = FALSE
    WHERE unit_id = p_unit_id 
      AND tenant_id = v_old_primary_tenant_id;
  END IF;

  -- Set the new primary applicant
  UPDATE unit_applications
  SET 
    application_status = 'primary_applicant',
    status_updated_at = NOW(),
    is_primary_applicant = TRUE
  WHERE unit_id = p_unit_id 
    AND tenant_id = p_tenant_id;

  RETURN TRUE;
END;
$$;

-- Recreate landlord_reject_primary_applicant with search_path security
CREATE OR REPLACE FUNCTION public.landlord_reject_primary_applicant(
  p_unit_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id UUID;
  v_landlord_id UUID;
  v_current_user_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get property and landlord info
  SELECT p.id, p.landlord_id INTO v_property_id, v_landlord_id
  FROM property_units pu
  JOIN properties p ON pu.property_id = p.id
  WHERE pu.id = p_unit_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Verify landlord owns this property
  IF v_landlord_id != v_current_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get the current primary applicant
  SELECT tenant_id INTO v_tenant_id
  FROM unit_applications
  WHERE unit_id = p_unit_id 
    AND application_status = 'primary_applicant'
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No primary applicant found for this unit';
  END IF;

  -- Reject the primary applicant
  UPDATE unit_applications
  SET 
    application_status = 'denied',
    status_updated_at = NOW(),
    rejection_reason = COALESCE(p_reason, 'Rejected by landlord'),
    is_primary_applicant = FALSE
  WHERE unit_id = p_unit_id 
    AND tenant_id = v_tenant_id;

  -- Unpause the listing if it was paused
  UPDATE property_units
  SET listing_status = 'active'
  WHERE id = p_unit_id 
    AND listing_status = 'paused';

  RETURN TRUE;
END;
$$;