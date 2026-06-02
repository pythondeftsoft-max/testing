CREATE OR REPLACE FUNCTION public.check_messaging_quota(
  p_application_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE(can_message boolean, messages_remaining integer, reason text, is_primary boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_message_count INTEGER;
  v_can_message BOOLEAN;
  v_messages_remaining INTEGER;
  v_reason TEXT;
  v_is_primary BOOLEAN := false;
BEGIN
  -- Check if the landlord has sent at least one message to this application
  -- Includes property_push_id for admin-driven matches
  SELECT COUNT(*) INTO v_landlord_message_count
  FROM messages
  WHERE (property_application_id = p_application_id 
     OR marketplace_application_id = p_application_id 
     OR unit_application_id = p_application_id
     OR property_push_id = p_application_id)
    AND created_by_tenant = FALSE;
  
  -- Tenant can only message if landlord has sent at least one message
  v_can_message := v_landlord_message_count > 0;
  v_messages_remaining := CASE WHEN v_can_message THEN 999999 ELSE 0 END;
  v_reason := CASE 
    WHEN v_can_message THEN NULL 
    ELSE 'Please wait for the landlord to send the first message'
  END;
  
  RETURN QUERY SELECT v_can_message, v_messages_remaining, v_reason, v_is_primary;
END;
$$;