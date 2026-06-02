-- Fix messaging quota function to use correct column name and update limit to 5

DROP FUNCTION IF EXISTS check_messaging_quota(UUID, UUID);

CREATE OR REPLACE FUNCTION check_messaging_quota(
  p_application_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  can_message BOOLEAN,
  messages_remaining INTEGER,
  reason TEXT,
  is_primary BOOLEAN
) AS $$
DECLARE
  v_is_primary BOOLEAN;
  v_is_blocked BOOLEAN;
  v_landlord_message_count INTEGER;
  v_max_landlord_messages INTEGER := 5;  -- Updated from 3 to 5
  v_unit_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get application details using correct column name (user_id, not tenant_id)
  SELECT unit_id, user_id INTO v_unit_id, v_tenant_id
  FROM marketplace_applications
  WHERE id = p_application_id;

  -- Check if applicant is primary
  SELECT is_primary_applicant INTO v_is_primary
  FROM marketplace_applications
  WHERE id = p_application_id;

  -- If primary applicant, unlimited messaging
  IF v_is_primary THEN
    RETURN QUERY SELECT TRUE, 999999, 'Primary applicant - unlimited messaging'::TEXT, TRUE;
    RETURN;
  END IF;

  -- Check if conversation is blocked
  SELECT is_blocked INTO v_is_blocked
  FROM message_conversations
  WHERE tenant_id = v_tenant_id
    AND property_application_id = p_application_id
  LIMIT 1;

  IF v_is_blocked THEN
    RETURN QUERY SELECT FALSE, 0, 'Conversation is blocked'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Count existing messages from landlord
  SELECT COUNT(*) INTO v_landlord_message_count
  FROM messages
  WHERE property_application_id = p_application_id
    AND sender_id = p_user_id
    AND message_type = 'landlord_to_tenant';

  -- Check if landlord has reached the limit
  IF v_landlord_message_count >= v_max_landlord_messages THEN
    RETURN QUERY SELECT FALSE, 0, 'Message limit reached for non-primary applicant'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Return remaining message count
  RETURN QUERY SELECT 
    TRUE, 
    (v_max_landlord_messages - v_landlord_message_count)::INTEGER,
    'Messages remaining'::TEXT,
    FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;