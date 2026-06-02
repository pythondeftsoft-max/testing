-- Fix check_messaging_quota to check unit_applications table for primary status
DROP FUNCTION IF EXISTS check_messaging_quota(UUID, UUID);

CREATE OR REPLACE FUNCTION public.check_messaging_quota(
  p_application_id UUID,
  p_user_id UUID
)
RETURNS TABLE(
  can_message BOOLEAN,
  messages_remaining INTEGER,
  reason TEXT,
  is_primary BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_primary BOOLEAN := FALSE;
  v_landlord_message_count INTEGER;
  v_max_landlord_messages INTEGER := 5;
BEGIN
  -- Check unit_applications first (this is where the actual data is)
  SELECT is_primary_applicant INTO v_is_primary
  FROM unit_applications
  WHERE id = p_application_id;
  
  -- If not found in unit_applications, check property_applications
  IF v_is_primary IS NULL THEN
    SELECT is_primary_applicant INTO v_is_primary
    FROM property_applications
    WHERE id = p_application_id;
  END IF;
  
  -- If application not found in either table, return error
  IF v_is_primary IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Application not found'::TEXT, FALSE;
    RETURN;
  END IF;

  -- If primary applicant, unlimited messaging
  IF v_is_primary THEN
    RETURN QUERY SELECT TRUE, 999999, 'Primary applicant - unlimited messaging'::TEXT, TRUE;
    RETURN;
  END IF;

  -- Count only APPLICATION context messages from landlord
  SELECT COUNT(*) INTO v_landlord_message_count
  FROM messages
  WHERE property_application_id = p_application_id
    AND created_by_tenant = FALSE
    AND message_context = 'application';

  -- Check if landlord has reached the 5-message limit
  IF v_landlord_message_count >= v_max_landlord_messages THEN
    RETURN QUERY SELECT FALSE, 0, 'Message limit reached - set as primary for unlimited messaging'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Return remaining message count
  RETURN QUERY SELECT 
    TRUE, 
    (v_max_landlord_messages - v_landlord_message_count)::INTEGER,
    'Messages remaining'::TEXT,
    FALSE;
END;
$$;