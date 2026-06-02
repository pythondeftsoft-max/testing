-- Complete Messaging System Overhaul (Fixed)
-- Part 1: Add missing columns to tables

-- Add is_primary_applicant to marketplace_applications
ALTER TABLE marketplace_applications 
ADD COLUMN IF NOT EXISTS is_primary_applicant BOOLEAN DEFAULT FALSE;

-- Add message_context to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_context TEXT DEFAULT 'application';

-- Add constraint for message_context
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_message_context_check;

ALTER TABLE messages 
ADD CONSTRAINT messages_message_context_check 
CHECK (message_context IN ('application', 'tenant', 'general'));

-- Set existing messages to 'tenant' context (grandfathered as regular messages)
UPDATE messages 
SET message_context = 'tenant' 
WHERE created_at < NOW();

-- Part 2: Fix check_messaging_quota function
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
  v_landlord_message_count INTEGER;
  v_max_landlord_messages INTEGER := 5;
BEGIN
  -- Get primary status from marketplace_applications
  SELECT is_primary_applicant INTO v_is_primary
  FROM marketplace_applications
  WHERE id = p_application_id;
  
  -- If application not found, return error
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Part 3: Update send_tenant_message function
DROP FUNCTION IF EXISTS send_tenant_message(UUID, UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION send_tenant_message(
  tenant_id UUID,
  application_id UUID,
  message_text TEXT,
  message_payload JSONB DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_can_message BOOLEAN;
  v_messages_remaining INT;
  v_reason TEXT;
  v_message_id UUID;
  v_landlord_id UUID;
BEGIN
  -- Get the landlord ID (current user sending the message)
  v_landlord_id := auth.uid();
  
  -- Check quota using the fixed function
  SELECT 
    cq.can_message,
    cq.messages_remaining,
    cq.reason
  INTO 
    v_can_message,
    v_messages_remaining,
    v_reason
  FROM check_messaging_quota(application_id, v_landlord_id) cq
  LIMIT 1;

  -- If cannot message, return error
  IF NOT v_can_message THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, v_reason;
    RETURN;
  END IF;

  -- Insert the message with APPLICATION context
  INSERT INTO messages (
    property_application_id,
    sender_id,
    message_text,
    created_by_tenant,
    read_by_tenant,
    read_by_landlord,
    payload,
    message_context
  )
  VALUES (
    application_id,
    v_landlord_id,
    message_text,
    FALSE,  -- landlord is sending
    FALSE,  -- tenant hasn't read yet
    TRUE,   -- landlord has read (they wrote it)
    message_payload,
    'application'  -- Mark as application-stage message
  )
  RETURNING id INTO v_message_id;

  RETURN QUERY SELECT TRUE, v_message_id, NULL::TEXT;
END;
$$;

-- Add helpful comments
COMMENT ON COLUMN messages.message_context IS 'Context: application (pre-acceptance, 5-msg quota), tenant (accepted, no quota), general (admin/system)';
COMMENT ON COLUMN marketplace_applications.is_primary_applicant IS 'Primary applicants get unlimited messaging during application stage';