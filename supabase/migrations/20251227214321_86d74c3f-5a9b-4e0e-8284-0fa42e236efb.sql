-- Fix the current stuck push for 1360 Scotch Mountain Road Unit 1
UPDATE property_pushes
SET status = 'denied', updated_at = NOW()
WHERE id = 'c4a26c83-ce71-479d-a4ff-453d5fdaceba';

-- Update the landlord_reject_primary_applicant function to also update property_pushes
CREATE OR REPLACE FUNCTION public.landlord_reject_primary_applicant(
  p_unit_id uuid DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'Not a fit'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_id uuid;
  v_unit_id uuid;
  v_property_id uuid;
  v_user_id uuid;
  v_result jsonb;
BEGIN
  -- Get the current user
  v_landlord_id := auth.uid();
  
  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Determine unit_id from either direct parameter or property lookup
  IF p_unit_id IS NOT NULL THEN
    v_unit_id := p_unit_id;
  ELSIF p_property_id IS NOT NULL THEN
    -- Get the first unit with a primary applicant for this property
    SELECT pu.id INTO v_unit_id
    FROM property_units pu
    JOIN properties p ON p.id = pu.property_id
    WHERE pu.property_id = p_property_id
      AND pu.primary_applicant_id IS NOT NULL
      AND p.landlord_id = v_landlord_id
    LIMIT 1;
  END IF;

  IF v_unit_id IS NULL THEN
    RAISE EXCEPTION 'No unit specified or found';
  END IF;

  -- Get the unit details and verify ownership
  SELECT pu.property_id, pu.primary_applicant_id
  INTO v_property_id, v_user_id
  FROM property_units pu
  JOIN properties p ON p.id = pu.property_id
  WHERE pu.id = v_unit_id
    AND p.landlord_id = v_landlord_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Unit not found or not owned by landlord';
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No primary applicant found for this unit';
  END IF;

  -- Update marketplace_applications to rejected
  UPDATE marketplace_applications
  SET status = 'rejected',
      rejection_reason = p_reason,
      updated_at = NOW()
  WHERE tenant_id = v_user_id
    AND unit_id = v_unit_id
    AND status IN ('pending', 'under_review', 'approved');

  -- Update property_applications to rejected
  UPDATE property_applications
  SET status = 'rejected',
      rejection_reason = p_reason,
      updated_at = NOW()
  WHERE tenant_id = v_user_id
    AND unit_id = v_unit_id
    AND status IN ('pending', 'under_review', 'approved');

  -- Update property_pushes to denied for this tenant/unit
  UPDATE property_pushes
  SET status = 'denied',
      updated_at = NOW()
  WHERE unit_id = v_unit_id
    AND tenant_id = v_user_id
    AND status != 'denied';

  -- Clear primary applicant and reset unit to available
  UPDATE property_units
  SET primary_applicant_id = NULL,
      pipeline_stage = 'available',
      on_market = true,
      updated_at = NOW()
  WHERE id = v_unit_id;

  -- Set property back on market
  UPDATE properties
  SET on_market = true,
      updated_at = NOW()
  WHERE id = v_property_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'unit_id', v_unit_id,
    'property_id', v_property_id,
    'tenant_id', v_user_id,
    'message', 'Primary applicant rejected successfully'
  );

  RETURN v_result;
END;
$$;