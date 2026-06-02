-- Drop existing functions first to allow changing return type
DROP FUNCTION IF EXISTS public.check_landlord_messaging_quota(uuid, uuid);
DROP FUNCTION IF EXISTS public.check_messaging_quota(uuid, uuid);

-- Recreate check_landlord_messaging_quota with correct column names
CREATE OR REPLACE FUNCTION public.check_landlord_messaging_quota(
  p_landlord_id UUID,
  p_application_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_messages_sent INTEGER;
  v_max_messages INTEGER := 5;
  v_messages_remaining INTEGER;
  v_can_message BOOLEAN;
BEGIN
  -- Count messages sent by the landlord for this application
  -- The messages table uses property_application_id, marketplace_application_id, or unit_application_id
  SELECT COUNT(*) INTO v_messages_sent
  FROM messages
  WHERE (property_application_id = p_application_id 
     OR marketplace_application_id = p_application_id 
     OR unit_application_id = p_application_id)
    AND created_by_tenant = FALSE;
  
  v_messages_remaining := GREATEST(0, v_max_messages - v_messages_sent);
  v_can_message := v_messages_remaining > 0;
  
  RETURN json_build_object(
    'can_message', v_can_message,
    'messages_remaining', v_messages_remaining,
    'reason', CASE 
      WHEN v_can_message THEN NULL 
      ELSE 'You have reached the maximum of 5 messages before a decision is required'
    END
  );
END;
$$;

-- Recreate check_messaging_quota with correct column names
CREATE OR REPLACE FUNCTION public.check_messaging_quota(
  p_tenant_id UUID,
  p_application_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_message_count INTEGER;
  v_can_message BOOLEAN;
BEGIN
  -- Check if the landlord has sent at least one message to this application
  -- The messages table uses property_application_id, marketplace_application_id, or unit_application_id
  SELECT COUNT(*) INTO v_landlord_message_count
  FROM messages
  WHERE (property_application_id = p_application_id 
     OR marketplace_application_id = p_application_id 
     OR unit_application_id = p_application_id)
    AND created_by_tenant = FALSE;
  
  -- Tenant can only message if landlord has sent at least one message
  v_can_message := v_landlord_message_count > 0;
  
  RETURN json_build_object(
    'can_message', v_can_message,
    'messages_remaining', CASE WHEN v_can_message THEN -1 ELSE 0 END,
    'reason', CASE 
      WHEN v_can_message THEN NULL 
      ELSE 'Please wait for the landlord to send the first message'
    END
  );
END;
$$;