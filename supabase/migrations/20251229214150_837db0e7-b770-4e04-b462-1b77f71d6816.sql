CREATE OR REPLACE FUNCTION public.check_landlord_messaging_quota(p_application_id uuid, p_landlord_id uuid)
RETURNS TABLE(can_message boolean, messages_remaining integer, reason text, is_primary boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_property_id uuid;
  v_message_count integer;
  v_remaining integer;
  v_is_primary boolean := false;
  v_landlord_owns boolean := false;
BEGIN
  -- Try marketplace_applications first (FIXED: use user_id instead of applicant_id)
  SELECT ma.user_id, ma.property_id, ma.is_primary_applicant
  INTO v_tenant_id, v_property_id, v_is_primary
  FROM marketplace_applications ma
  WHERE ma.id = p_application_id;

  IF v_property_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM properties p
      WHERE p.id = v_property_id AND p.owner_id = p_landlord_id
    ) INTO v_landlord_owns;
    
    IF v_landlord_owns THEN
      IF v_is_primary THEN
        RETURN QUERY SELECT true, 999999, NULL::text, true;
        RETURN;
      END IF;
      
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

  -- Try property_applications
  SELECT pa.tenant_id, pa.property_id, pa.is_primary_applicant
  INTO v_tenant_id, v_property_id, v_is_primary
  FROM property_applications pa
  WHERE pa.id = p_application_id;

  IF v_property_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM properties p
      WHERE p.id = v_property_id AND p.owner_id = p_landlord_id
    ) INTO v_landlord_owns;
    
    IF v_landlord_owns THEN
      IF v_is_primary THEN
        RETURN QUERY SELECT true, 999999, NULL::text, true;
        RETURN;
      END IF;
      
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

  -- Try property_pushes (admin push applications) - WITH PRIMARY APPLICANT SUPPORT
  SELECT pp.tenant_id, pp.property_id, (pp.status = 'primary_applicant')
  INTO v_tenant_id, v_property_id, v_is_primary
  FROM property_pushes pp
  WHERE pp.id = p_application_id;

  IF v_property_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM properties p
      WHERE p.id = v_property_id AND p.owner_id = p_landlord_id
    ) INTO v_landlord_owns;
    
    IF v_landlord_owns THEN
      IF v_is_primary THEN
        RETURN QUERY SELECT true, 999999, NULL::text, true;
        RETURN;
      END IF;
      
      SELECT COUNT(*)::integer INTO v_message_count
      FROM messages m
      WHERE m.property_push_id = p_application_id
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

  RETURN QUERY SELECT false, 0, 'Application not found or access denied'::text, false;
END;
$$;