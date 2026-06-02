-- Add payload column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS payload JSONB;

-- Fix send_tenant_message function to work with actual schema
CREATE OR REPLACE FUNCTION public.send_tenant_message(
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
SET search_path = public
AS $$
DECLARE
  v_can_message BOOLEAN;
  v_messages_remaining INT;
  v_reason TEXT;
  v_message_id UUID;
BEGIN
  -- Check quota first
  SELECT 
    can_message,
    messages_remaining,
    reason
  INTO 
    v_can_message,
    v_messages_remaining,
    v_reason
  FROM check_messaging_quota(tenant_id, application_id)
  LIMIT 1;

  -- If cannot message, return error
  IF NOT v_can_message THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, v_reason;
    RETURN;
  END IF;

  -- Insert the message into the messages table with payload
  INSERT INTO messages (
    property_application_id,
    sender_id,
    message_text,
    created_by_tenant,
    read_by_tenant,
    read_by_landlord,
    payload
  )
  VALUES (
    application_id,
    tenant_id,
    message_text,
    TRUE,
    TRUE,
    FALSE,
    message_payload
  )
  RETURNING id INTO v_message_id;

  RETURN QUERY SELECT TRUE, v_message_id, NULL::TEXT;
END;
$$;