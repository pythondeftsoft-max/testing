-- Drop existing functions first to allow changing return type
DROP FUNCTION IF EXISTS public.check_landlord_messaging_quota(uuid, uuid);
DROP FUNCTION IF EXISTS public.check_messaging_quota(uuid, uuid);

-- Recreate check_landlord_messaging_quota to return TABLE instead of JSON
CREATE OR REPLACE FUNCTION public.check_landlord_messaging_quota(
  p_application_id UUID,
  p_landlord_id UUID
)
RETURNS TABLE(can_message boolean, messages_remaining integer, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_messages_sent INTEGER;
  v_max_messages INTEGER := 5;
  v_messages_remaining INTEGER;
  v_can_message BOOLEAN;
  v_reason TEXT;
BEGIN
  -- Count messages sent by the landlord for this application
  SELECT COUNT(*) INTO v_messages_sent
  FROM messages
  WHERE (property_application_id = p_application_id 
     OR marketplace_application_id = p_application_id 
     OR unit_application_id = p_application_id)
    AND created_by_tenant = FALSE;
  
  v_messages_remaining := GREATEST(0, v_max_messages - v_messages_sent);
  v_can_message := v_messages_remaining > 0;
  v_reason := CASE 
    WHEN v_can_message THEN NULL 
    ELSE 'You have reached the maximum of 5 messages before a decision is required'
  END;
  
  RETURN QUERY SELECT v_can_message, v_messages_remaining, v_reason;
END;
$$;

-- Recreate check_messaging_quota to return TABLE instead of JSON
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
  SELECT COUNT(*) INTO v_landlord_message_count
  FROM messages
  WHERE (property_application_id = p_application_id 
     OR marketplace_application_id = p_application_id 
     OR unit_application_id = p_application_id)
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