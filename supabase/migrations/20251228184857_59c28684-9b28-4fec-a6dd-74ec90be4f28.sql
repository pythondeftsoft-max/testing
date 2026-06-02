-- Drop and recreate landlord_reject_primary_applicant with correct column name
DROP FUNCTION IF EXISTS public.landlord_reject_primary_applicant(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.landlord_reject_primary_applicant(
  p_unit_id uuid DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'Not a fit'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit_id uuid;
  v_user_id uuid;
  v_landlord_id uuid;
  v_property_id uuid;
BEGIN
  v_landlord_id := auth.uid();
  
  -- Get unit_id from either direct parameter or property lookup
  IF p_unit_id IS NOT NULL THEN
    v_unit_id := p_unit_id;
  ELSIF p_property_id IS NOT NULL THEN
    SELECT id INTO v_unit_id
    FROM property_units
    WHERE property_id = p_property_id
    LIMIT 1;
  END IF;
  
  IF v_unit_id IS NULL THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;
  
  -- Verify landlord owns this unit (FIX: use owner_id, not landlord_id)
  SELECT pu.property_id INTO v_property_id
  FROM property_units pu
  JOIN properties p ON pu.property_id = p.id
  WHERE pu.id = v_unit_id
    AND p.owner_id = v_landlord_id;
    
  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this unit';
  END IF;
  
  -- First try to get the primary applicant from unit
  SELECT primary_applicant_id INTO v_user_id
  FROM property_units
  WHERE id = v_unit_id;
  
  -- If no primary applicant on unit, look for primary_applicant status in pushes
  IF v_user_id IS NULL THEN
    SELECT pp.tenant_id INTO v_user_id
    FROM property_pushes pp
    WHERE pp.unit_id = v_unit_id
      AND pp.status = 'primary_applicant'
    ORDER BY pp.pushed_at DESC
    LIMIT 1;
  END IF;
  
  -- If still no primary, look for landlord_review status
  IF v_user_id IS NULL THEN
    SELECT pp.tenant_id INTO v_user_id
    FROM property_pushes pp
    WHERE pp.unit_id = v_unit_id
      AND pp.status = 'landlord_review'
    ORDER BY pp.pushed_at DESC
    LIMIT 1;
  END IF;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No primary applicant or pending review found for this unit';
  END IF;
  
  -- Clear primary applicant from unit
  UPDATE property_units
  SET 
    primary_applicant_id = NULL,
    updated_at = NOW()
  WHERE id = v_unit_id
    AND primary_applicant_id = v_user_id;
  
  -- Update property push status to denied
  UPDATE property_pushes
  SET 
    status = 'denied',
    updated_at = NOW()
  WHERE unit_id = v_unit_id
    AND tenant_id = v_user_id
    AND status IN ('push_sent', 'interested', 'landlord_review', 'primary_applicant');
  
  -- Reject any related marketplace applications
  UPDATE marketplace_applications
  SET 
    status = 'rejected',
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE unit_id = v_unit_id
    AND user_id = v_user_id
    AND status IN ('submitted', 'pending', 'under_review');
  
  -- Reactivate the listing
  UPDATE properties
  SET 
    listing_status = 'active',
    updated_at = NOW()
  WHERE id = v_property_id;
  
  RETURN json_build_object(
    'success', true,
    'unit_id', v_unit_id,
    'tenant_id', v_user_id,
    'property_id', v_property_id
  );
END;
$$;