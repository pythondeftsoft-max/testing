-- Step 1: Create landlord messaging quota check function
CREATE OR REPLACE FUNCTION public.check_landlord_messaging_quota(p_application_id uuid, p_landlord_id uuid)
RETURNS TABLE(can_message boolean, messages_remaining integer, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_primary BOOLEAN := FALSE;
  v_is_housed BOOLEAN := FALSE;
  v_landlord_message_count INTEGER;
  v_max_messages INTEGER := 5;
BEGIN
  -- Check marketplace_applications first
  SELECT is_primary_applicant, (status = 'housed')
  INTO v_is_primary, v_is_housed
  FROM marketplace_applications
  WHERE id = p_application_id;
  
  -- If not found, check unit_applications
  IF v_is_primary IS NULL THEN
    SELECT is_primary_applicant, (status = 'housed')
    INTO v_is_primary, v_is_housed
    FROM unit_applications
    WHERE id = p_application_id;
  END IF;
  
  -- If still not found, check property_applications
  IF v_is_primary IS NULL THEN
    SELECT is_primary_applicant, (status = 'housed')
    INTO v_is_primary, v_is_housed
    FROM property_applications
    WHERE id = p_application_id;
  END IF;
  
  -- Application not found
  IF v_is_primary IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Application not found'::TEXT;
    RETURN;
  END IF;

  -- If primary or housed, unlimited messaging
  IF v_is_primary OR v_is_housed THEN
    RETURN QUERY SELECT TRUE, 999999, 'Primary/housed applicant - unlimited messaging'::TEXT;
    RETURN;
  END IF;

  -- Count landlord messages to this application (created_by_tenant = false)
  SELECT COUNT(*)::INTEGER INTO v_landlord_message_count
  FROM messages
  WHERE application_id = p_application_id AND created_by_tenant = FALSE;

  -- Check if landlord has reached limit
  IF v_landlord_message_count >= v_max_messages THEN
    RETURN QUERY SELECT FALSE, 0, 'You have sent 5 messages. Please make this applicant primary or deny to continue messaging.'::TEXT;
  ELSE
    RETURN QUERY SELECT TRUE, (v_max_messages - v_landlord_message_count)::INTEGER, 
      format('%s messages remaining before decision required', v_max_messages - v_landlord_message_count)::TEXT;
  END IF;
END;
$$;

-- Step 2: Update check_messaging_quota for tenant side (they respond unlimited once landlord messages)
CREATE OR REPLACE FUNCTION public.check_messaging_quota(p_application_id uuid, p_user_id uuid)
RETURNS TABLE(can_message boolean, messages_remaining integer, reason text, is_primary boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_primary BOOLEAN := FALSE;
  v_is_housed BOOLEAN := FALSE;
  v_has_quota_bypass BOOLEAN := FALSE;
  v_property_id UUID;
  v_landlord_message_count INTEGER;
BEGIN
  -- Check marketplace_applications first
  SELECT is_primary_applicant, (status = 'housed'), property_id 
  INTO v_is_primary, v_is_housed, v_property_id
  FROM marketplace_applications
  WHERE id = p_application_id;
  
  -- If not found, check unit_applications
  IF v_is_primary IS NULL THEN
    SELECT ua.is_primary_applicant, (ua.status = 'housed'), pu.property_id
    INTO v_is_primary, v_is_housed, v_property_id
    FROM unit_applications ua
    JOIN property_units pu ON pu.id = ua.unit_id
    WHERE ua.id = p_application_id;
  END IF;
  
  -- If still not found, check property_applications
  IF v_is_primary IS NULL THEN
    SELECT is_primary_applicant, (status = 'housed'), property_id 
    INTO v_is_primary, v_is_housed, v_property_id
    FROM property_applications
    WHERE id = p_application_id;
  END IF;
  
  -- Application not found
  IF v_is_primary IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Application not found'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Check for active quota_bypass from property_pushes
  IF v_property_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM property_pushes
      WHERE tenant_id = p_user_id
        AND property_id = v_property_id
        AND quota_bypass = true
        AND expires_at > NOW()
    ) INTO v_has_quota_bypass;
  END IF;

  -- If primary OR housed OR has quota bypass, unlimited messaging
  IF v_is_primary OR v_is_housed OR v_has_quota_bypass THEN
    RETURN QUERY SELECT TRUE, 999999, 
      CASE 
        WHEN v_is_housed THEN 'Housed tenant - unlimited messaging'::TEXT
        WHEN v_is_primary THEN 'Primary applicant - unlimited messaging'::TEXT
        ELSE 'Admin push - unlimited messaging'::TEXT
      END, 
      COALESCE(v_is_primary, FALSE);
    RETURN;
  END IF;

  -- For non-primary tenants: check if landlord has messaged first
  SELECT COUNT(*)::INTEGER INTO v_landlord_message_count
  FROM messages
  WHERE application_id = p_application_id AND created_by_tenant = FALSE;

  -- If landlord hasn't messaged yet, tenant cannot initiate
  IF v_landlord_message_count = 0 THEN
    RETURN QUERY SELECT FALSE, 0, 'Please wait for the landlord to send the first message'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Landlord has messaged, tenant can respond unlimited
  RETURN QUERY SELECT TRUE, 999999, 'You can respond to landlord messages'::TEXT, FALSE;
END;
$$;

-- Step 3: Update send_landlord_message to check quota before sending
CREATE OR REPLACE FUNCTION public.send_landlord_message(
  application_id uuid, 
  message_text text, 
  sender_id uuid, 
  p_payload jsonb DEFAULT NULL
)
RETURNS TABLE(success boolean, message_id uuid, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id UUID;
  v_can_message BOOLEAN;
  v_messages_remaining INTEGER;
  v_reason TEXT;
BEGIN
  -- Check landlord messaging quota first
  SELECT lq.can_message, lq.messages_remaining, lq.reason 
  INTO v_can_message, v_messages_remaining, v_reason
  FROM check_landlord_messaging_quota(application_id, sender_id) lq;

  IF NOT v_can_message THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, v_reason;
    RETURN;
  END IF;

  -- Insert the message
  INSERT INTO messages (
    application_id,
    sender_id,
    message_text,
    created_by_tenant,
    payload
  ) VALUES (
    application_id,
    sender_id,
    message_text,
    FALSE,
    p_payload
  )
  RETURNING id INTO v_message_id;

  RETURN QUERY SELECT TRUE, v_message_id, NULL::TEXT;
END;
$$;