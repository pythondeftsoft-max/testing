-- Drop old function overloads with incorrect signatures
DROP FUNCTION IF EXISTS send_tenant_message(uuid, uuid, text);
DROP FUNCTION IF EXISTS send_tenant_message(uuid, uuid, text, jsonb);

-- Create send_landlord_message function for landlords to send messages
CREATE OR REPLACE FUNCTION send_landlord_message(
  application_id uuid,
  message_text text,
  sender_id uuid
)
RETURNS TABLE (
  success boolean,
  message_id uuid,
  error_message text
) AS $$
DECLARE
  v_application_type text;
  v_message_id uuid;
BEGIN
  -- Get the application type
  v_application_type := get_application_type(application_id);
  
  IF v_application_type IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Application not found'::text;
    RETURN;
  END IF;

  -- Insert message with the correct application_id column
  IF v_application_type = 'marketplace' THEN
    INSERT INTO messages (marketplace_application_id, sender_id, message_text, created_by_tenant)
    VALUES (application_id, sender_id, message_text, false)
    RETURNING id INTO v_message_id;
  ELSIF v_application_type = 'unit' THEN
    INSERT INTO messages (unit_application_id, sender_id, message_text, created_by_tenant)
    VALUES (application_id, sender_id, message_text, false)
    RETURNING id INTO v_message_id;
  ELSIF v_application_type = 'property' THEN
    INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant)
    VALUES (application_id, sender_id, message_text, false)
    RETURNING id INTO v_message_id;
  ELSE
    RETURN QUERY SELECT false, NULL::uuid, 'Unknown application type'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_message_id, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;