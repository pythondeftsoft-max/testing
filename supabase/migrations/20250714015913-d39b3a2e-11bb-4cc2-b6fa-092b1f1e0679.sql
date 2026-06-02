-- Update check_message_limit function to always allow sending messages
CREATE OR REPLACE FUNCTION public.check_message_limit(p_tenant_id uuid, p_property_application_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_tenant_profile RECORD;
  v_message_limit RECORD;
BEGIN
  -- Get tenant profile (keeping for potential future use)
  SELECT * INTO v_tenant_profile 
  FROM tenant_profiles 
  WHERE user_id = p_tenant_id;
  
  -- Get or create message limit record (keeping for tracking)
  INSERT INTO message_limits (tenant_id, property_application_id)
  VALUES (p_tenant_id, p_property_application_id)
  ON CONFLICT (tenant_id, property_application_id) DO NOTHING;
  
  SELECT * INTO v_message_limit 
  FROM message_limits 
  WHERE tenant_id = p_tenant_id 
  AND property_application_id = p_property_application_id;
  
  -- Always allow sending messages - no restrictions
  RETURN jsonb_build_object(
    'can_send', true,
    'reason', 'Unlimited messaging enabled',
    'messages_sent', COALESCE(v_message_limit.messages_sent, 0),
    'credits_remaining', COALESCE(v_tenant_profile.message_credits, 2),
    'is_plus_subscriber', COALESCE(v_tenant_profile.is_plus_subscriber, false),
    'landlord_responded', COALESCE(v_message_limit.landlord_has_responded, false)
  );
END;
$function$;

-- Update update_message_count function to stop deducting credits
CREATE OR REPLACE FUNCTION public.update_message_count(p_tenant_id uuid, p_property_application_id uuid, p_is_from_tenant boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF p_is_from_tenant THEN
    -- Update tenant message count but don't deduct credits
    UPDATE message_limits 
    SET messages_sent = messages_sent + 1,
        last_message_sent_at = now(),
        updated_at = now()
    WHERE tenant_id = p_tenant_id 
    AND property_application_id = p_property_application_id;
    
    -- No longer deduct credits - unlimited messaging
  ELSE
    -- Mark that landlord has responded (keep for tracking)
    UPDATE message_limits 
    SET landlord_has_responded = TRUE,
        updated_at = now()
    WHERE tenant_id = p_tenant_id 
    AND property_application_id = p_property_application_id;
  END IF;
END;
$function$;