-- Drop and recreate landlord_reject_primary_applicant to fix is_primary_applicant flag
DROP FUNCTION IF EXISTS landlord_reject_primary_applicant(UUID, UUID, TEXT);

CREATE FUNCTION landlord_reject_primary_applicant(
  p_unit_id UUID DEFAULT NULL,
  p_property_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Not a fit'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_id UUID;
  v_tenant_id UUID;
  v_property_id UUID;
  v_unit_id UUID;
BEGIN
  -- Get the current user (landlord)
  v_landlord_id := auth.uid();
  
  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Determine property_id and get tenant_id from property_units
  IF p_unit_id IS NOT NULL THEN
    SELECT primary_applicant_id, property_id
    INTO v_tenant_id, v_property_id
    FROM property_units
    WHERE id = p_unit_id AND primary_applicant_id IS NOT NULL;
    
    v_unit_id := p_unit_id;
  ELSIF p_property_id IS NOT NULL THEN
    SELECT primary_applicant_id, id
    INTO v_tenant_id, v_unit_id
    FROM property_units
    WHERE property_id = p_property_id AND primary_applicant_id IS NOT NULL
    LIMIT 1;
    
    v_property_id := p_property_id;
  ELSE
    RAISE EXCEPTION 'Either unit_id or property_id must be provided';
  END IF;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No primary applicant found for this unit';
  END IF;

  -- Clear primary applicant from property_units
  UPDATE property_units
  SET 
    primary_applicant_id = NULL,
    listing_status = 'active',
    updated_at = now()
  WHERE id = v_unit_id;

  -- Update marketplace_applications: set status to withdrawn AND clear is_primary_applicant flag
  UPDATE marketplace_applications
  SET 
    status = 'withdrawn',
    is_primary_applicant = false,
    updated_at = now()
  WHERE user_id = v_tenant_id
  AND property_id = v_property_id
  AND status != 'withdrawn';

  -- Update property_applications: set status to rejected AND clear is_primary_applicant flag
  UPDATE property_applications
  SET 
    status = 'rejected',
    is_primary_applicant = false,
    rejection_reason = p_reason,
    updated_at = now()
  WHERE tenant_id = v_tenant_id
  AND unit_id = v_unit_id
  AND status != 'rejected';

  RETURN json_build_object(
    'success', true,
    'unit_id', v_unit_id,
    'tenant_id', v_tenant_id,
    'property_id', v_property_id
  );
END;
$$;

-- Fix existing broken data for 160 East Walnut Street property
UPDATE marketplace_applications
SET 
  status = 'withdrawn',
  is_primary_applicant = false,
  updated_at = now()
WHERE property_id = '7a3ea217-00e5-4d8d-bc0a-9142a1758c8a'
AND is_primary_applicant = true;