-- Update check_landlord_messaging_quota to recognize lease_sent and lease_signed as primary applicant equivalent
CREATE OR REPLACE FUNCTION public.check_landlord_messaging_quota(p_application_id uuid, p_landlord_id uuid)
RETURNS TABLE(can_message boolean, messages_remaining integer, reason text, is_primary boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_count integer;
  v_is_primary boolean := false;
  v_application_type text;
  v_has_decision boolean := false;
BEGIN
  -- First determine application type and check if it's a primary applicant
  -- Check property_applications first
  SELECT 
    'property_application',
    COALESCE(pa.is_primary_applicant, false)
  INTO v_application_type, v_is_primary
  FROM property_applications pa
  WHERE pa.id = p_application_id
  AND EXISTS (
    SELECT 1 FROM properties p
    JOIN property_units pu ON pu.property_id = p.id
    WHERE pu.id = pa.unit_id AND p.owner_id = p_landlord_id
  );

  -- If not found in property_applications, check marketplace_applications
  IF v_application_type IS NULL THEN
    SELECT 
      'marketplace_application',
      COALESCE(ma.is_primary_applicant, false)
    INTO v_application_type, v_is_primary
    FROM marketplace_applications ma
    WHERE ma.id = p_application_id
    AND EXISTS (
      SELECT 1 FROM properties p
      JOIN property_units pu ON pu.property_id = p.id
      WHERE pu.id = ma.unit_id AND p.owner_id = p_landlord_id
    );
  END IF;

  -- If not found in marketplace_applications, check property_pushes
  IF v_application_type IS NULL THEN
    SELECT 
      'property_push',
      -- Consider primary_applicant, lease_sent, and lease_signed as "primary" for messaging
      (pp.status IN ('primary_applicant', 'lease_sent', 'lease_signed'))
    INTO v_application_type, v_is_primary
    FROM property_pushes pp
    WHERE pp.id = p_application_id
    AND EXISTS (
      SELECT 1 FROM properties p
      JOIN property_units pu ON pu.property_id = p.id
      WHERE pu.id = pp.unit_id AND p.owner_id = p_landlord_id
    );
  END IF;

  -- If application not found or landlord doesn't own the property
  IF v_application_type IS NULL THEN
    RETURN QUERY SELECT false, 0, 'Application not found or access denied'::text, false;
    RETURN;
  END IF;

  -- Primary applicants get unlimited messaging
  IF v_is_primary THEN
    RETURN QUERY SELECT true, 999, 'Unlimited messaging for primary applicant'::text, true;
    RETURN;
  END IF;

  -- Check if landlord has made a decision (accepted/rejected) on this application
  IF v_application_type = 'property_application' THEN
    SELECT EXISTS (
      SELECT 1 FROM property_applications pa
      WHERE pa.id = p_application_id
      AND pa.status IN ('accepted', 'rejected', 'housed', 'lease_sent', 'lease_signed')
    ) INTO v_has_decision;
  ELSIF v_application_type = 'marketplace_application' THEN
    SELECT EXISTS (
      SELECT 1 FROM marketplace_applications ma
      WHERE ma.id = p_application_id
      AND ma.status::text IN ('accepted', 'rejected', 'housed', 'lease_sent', 'lease_signed')
    ) INTO v_has_decision;
  ELSIF v_application_type = 'property_push' THEN
    SELECT EXISTS (
      SELECT 1 FROM property_pushes pp
      WHERE pp.id = p_application_id
      AND pp.status IN ('accepted', 'rejected', 'housed', 'lease_sent', 'lease_signed')
    ) INTO v_has_decision;
  END IF;

  -- If decision made, allow unlimited messaging
  IF v_has_decision THEN
    RETURN QUERY SELECT true, 999, 'Unlimited messaging after decision'::text, false;
    RETURN;
  END IF;

  -- Count existing messages from this landlord to this application
  SELECT COUNT(*)::integer INTO v_message_count
  FROM messages m
  WHERE m.sender_id = p_landlord_id
  AND (
    m.property_application_id = p_application_id
    OR m.marketplace_application_id = p_application_id
    OR m.property_push_id = p_application_id
  );

  -- Landlords get 5 messages before needing to make a decision
  IF v_message_count >= 5 THEN
    RETURN QUERY SELECT false, 0, 'Message limit reached. Set as primary applicant to continue messaging.'::text, false;
  ELSE
    RETURN QUERY SELECT true, (5 - v_message_count)::integer, 'Messages remaining before decision required'::text, false;
  END IF;
END;
$$;