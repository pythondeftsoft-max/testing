-- Update send_tenant_message function to support payload
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
  v_property_id UUID;
  v_landlord_id UUID;
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

  -- Get property_id and landlord_id from application
  SELECT pa.property_id, p.landlord_id
  INTO v_property_id, v_landlord_id
  FROM property_applications pa
  JOIN properties p ON p.id = pa.property_id
  WHERE pa.id = application_id;

  -- Insert the message with payload
  INSERT INTO tenant_messages (
    property_application_id,
    property_id,
    sender_id,
    receiver_id,
    message_text,
    created_by_tenant,
    read_by_tenant,
    read_by_landlord,
    payload
  )
  VALUES (
    application_id,
    v_property_id,
    tenant_id,
    v_landlord_id,
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