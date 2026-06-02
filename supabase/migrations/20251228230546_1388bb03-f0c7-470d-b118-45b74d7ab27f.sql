-- Drop the existing function first (return type changed)
DROP FUNCTION IF EXISTS public.check_landlord_messaging_quota(uuid, uuid);

-- Recreate with is_primary return value
CREATE OR REPLACE FUNCTION public.check_landlord_messaging_quota(
  p_application_id uuid,
  p_landlord_id uuid
)
RETURNS TABLE(can_message boolean, messages_remaining integer, reason text, is_primary boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_property_id uuid;
  v_unit_id uuid;
  v_is_primary boolean := false;
  v_landlord_owns boolean := false;
BEGIN
  -- Try marketplace_applications first (unit applications)
  SELECT ma.user_id, pu.property_id, ma.unit_id, COALESCE(ma.is_primary_applicant, false)
  INTO v_tenant_id, v_property_id, v_unit_id, v_is_primary
  FROM marketplace_applications ma
  JOIN property_units pu ON ma.unit_id = pu.id
  WHERE ma.id = p_application_id;
  
  -- If found, verify landlord owns the property
  IF v_property_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM properties p
      WHERE p.id = v_property_id AND p.landlord_id = p_landlord_id
    ) INTO v_landlord_owns;
    
    IF v_landlord_owns THEN
      RETURN QUERY SELECT true, 999999, NULL::text, v_is_primary;
      RETURN;
    END IF;
  END IF;
  
  -- Try property_applications (direct property applications)
  SELECT pa.applicant_id, pa.property_id, COALESCE(pa.is_primary_applicant, false)
  INTO v_tenant_id, v_property_id, v_is_primary
  FROM property_applications pa
  WHERE pa.id = p_application_id;
  
  IF v_property_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM properties p
      WHERE p.id = v_property_id AND p.landlord_id = p_landlord_id
    ) INTO v_landlord_owns;
    
    IF v_landlord_owns THEN
      RETURN QUERY SELECT true, 999999, NULL::text, v_is_primary;
      RETURN;
    END IF;
  END IF;
  
  -- Default: not authorized
  RETURN QUERY SELECT false, 0, 'Not authorized to message this application'::text, false;
END;
$$;