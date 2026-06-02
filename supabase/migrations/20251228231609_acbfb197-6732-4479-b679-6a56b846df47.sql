-- Drop the existing function first
DROP FUNCTION IF EXISTS public.check_landlord_messaging_quota(uuid, uuid);

-- Recreate with correct column name (tenant_id instead of applicant_id)
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
  v_message_count integer := 0;
  v_remaining integer := 0;
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
      WHERE p.id = v_property_id AND p.owner_id = p_landlord_id
    ) INTO v_landlord_owns;
    
    IF v_landlord_owns THEN
      -- If primary applicant, unlimited messaging
      IF v_is_primary THEN
        RETURN QUERY SELECT true, 999999, NULL::text, true;
        RETURN;
      END IF;
      
      -- Count landlord messages sent to this application
      SELECT COUNT(*)::integer INTO v_message_count
      FROM messages m
      WHERE m.marketplace_application_id = p_application_id
        AND m.created_by_tenant = false;
      
      v_remaining := 5 - v_message_count;
      
      IF v_remaining > 0 THEN
        RETURN QUERY SELECT true, v_remaining, NULL::text, false;
      ELSE
        RETURN QUERY SELECT false, 0, 'Set as primary to continue messaging'::text, false;
      END IF;
      RETURN;
    END IF;
  END IF;
  
  -- Try property_applications (direct property applications) - FIXED: use tenant_id not applicant_id
  SELECT pa.tenant_id, pa.property_id, COALESCE(pa.is_primary_applicant, false)
  INTO v_tenant_id, v_property_id, v_is_primary
  FROM property_applications pa
  WHERE pa.id = p_application_id;
  
  IF v_property_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM properties p
      WHERE p.id = v_property_id AND p.owner_id = p_landlord_id
    ) INTO v_landlord_owns;
    
    IF v_landlord_owns THEN
      -- If primary applicant, unlimited messaging
      IF v_is_primary THEN
        RETURN QUERY SELECT true, 999999, NULL::text, true;
        RETURN;
      END IF;
      
      -- Count landlord messages sent to this application
      SELECT COUNT(*)::integer INTO v_message_count
      FROM messages m
      WHERE m.property_application_id = p_application_id
        AND m.created_by_tenant = false;
      
      v_remaining := 5 - v_message_count;
      
      IF v_remaining > 0 THEN
        RETURN QUERY SELECT true, v_remaining, NULL::text, false;
      ELSE
        RETURN QUERY SELECT false, 0, 'Set as primary to continue messaging'::text, false;
      END IF;
      RETURN;
    END IF;
  END IF;
  
  -- Default: not authorized
  RETURN QUERY SELECT false, 0, 'Not authorized to message this application'::text, false;
END;
$$;