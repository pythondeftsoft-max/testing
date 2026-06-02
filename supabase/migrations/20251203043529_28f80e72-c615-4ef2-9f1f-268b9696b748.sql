-- Update check_messaging_quota to allow housed tenants unlimited messaging
CREATE OR REPLACE FUNCTION public.check_messaging_quota(p_application_id uuid, p_user_id uuid)
RETURNS TABLE(can_message boolean, messages_remaining integer, reason text, is_primary boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_is_primary BOOLEAN := FALSE;
  v_is_housed BOOLEAN := FALSE;
  v_landlord_message_count INTEGER;
  v_max_landlord_messages INTEGER := 5;
BEGIN
  -- Check marketplace_applications first (most common)
  SELECT is_primary_applicant, (status = 'housed') INTO v_is_primary, v_is_housed
  FROM marketplace_applications
  WHERE id = p_application_id;
  
  -- If not found, check unit_applications
  IF v_is_primary IS NULL THEN
    SELECT is_primary_applicant, (status = 'housed') INTO v_is_primary, v_is_housed
    FROM unit_applications
    WHERE id = p_application_id;
  END IF;
  
  -- If still not found, check property_applications
  IF v_is_primary IS NULL THEN
    SELECT is_primary_applicant, (status = 'housed') INTO v_is_primary, v_is_housed
    FROM property_applications
    WHERE id = p_application_id;
  END IF;
  
  -- If application not found in any table, return error
  IF v_is_primary IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Application not found'::TEXT, FALSE;
    RETURN;
  END IF;

  -- If primary applicant OR housed, unlimited messaging
  IF v_is_primary OR v_is_housed THEN
    RETURN QUERY SELECT TRUE, 999999, 
      CASE WHEN v_is_housed THEN 'Housed tenant - unlimited messaging'::TEXT
           ELSE 'Primary applicant - unlimited messaging'::TEXT END, 
      COALESCE(v_is_primary, FALSE) OR COALESCE(v_is_housed, FALSE);
    RETURN;
  END IF;

  -- For non-primary, non-housed applicants: check if landlord has messaged them first
  SELECT COUNT(*) INTO v_landlord_message_count
  FROM messages
  WHERE (marketplace_application_id = p_application_id OR property_application_id = p_application_id)
    AND created_by_tenant = FALSE;
  
  -- If landlord hasn't messaged yet, secondary applicant cannot message
  IF v_landlord_message_count = 0 THEN
    RETURN QUERY SELECT FALSE, 0, 'Please wait for the landlord to send the first message'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Landlord has messaged, secondary can respond up to limit
  DECLARE
    v_tenant_message_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_tenant_message_count
    FROM messages
    WHERE (marketplace_application_id = p_application_id OR property_application_id = p_application_id)
      AND sender_id = p_user_id
      AND created_by_tenant = TRUE;
    
    IF v_tenant_message_count >= v_max_landlord_messages THEN
      RETURN QUERY SELECT FALSE, 0, 'Message limit reached. Upgrade to continue messaging.'::TEXT, FALSE;
    ELSE
      RETURN QUERY SELECT TRUE, v_max_landlord_messages - v_tenant_message_count, 
        'Secondary applicant - limited messaging'::TEXT, FALSE;
    END IF;
  END;
END;
$function$;