-- Simplify send_tenant_message to handle only tenant messages
CREATE OR REPLACE FUNCTION send_tenant_message(
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
  v_is_primary boolean;
  v_messages_remaining int;
BEGIN
  -- Get the application type
  v_application_type := get_application_type(application_id);
  
  IF v_application_type IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Application not found'::text;
    RETURN;
  END IF;

  -- Check messaging quota for tenant (non-primary applicants)
  IF v_application_type = 'marketplace' THEN
    SELECT is_primary INTO v_is_primary 
    FROM marketplace_applications 
    WHERE id = application_id AND tenant_id = sender_id;
  ELSIF v_application_type = 'unit' THEN
    SELECT is_primary INTO v_is_primary 
    FROM unit_applications 
    WHERE id = application_id AND tenant_id = sender_id;
  ELSIF v_application_type = 'property' THEN
    SELECT is_primary INTO v_is_primary 
    FROM property_applications 
    WHERE id = application_id AND tenant_id = sender_id;
  ELSE
    RETURN QUERY SELECT false, NULL::uuid, 'Unknown application type'::text;
    RETURN;
  END IF;

  -- If not primary applicant, check quota
  IF NOT COALESCE(v_is_primary, false) THEN
    -- Get remaining messages
    SELECT messages_remaining INTO v_messages_remaining
    FROM get_tenant_message_quota(application_id, sender_id);
    
    IF v_messages_remaining <= 0 THEN
      RETURN QUERY SELECT false, NULL::uuid, 'Message quota exceeded. Set as primary applicant for unlimited messaging.'::text;
      RETURN;
    END IF;
  END IF;

  -- Insert message with the correct application_id column
  IF v_application_type = 'marketplace' THEN
    INSERT INTO messages (marketplace_application_id, sender_id, message_text, created_by_tenant)
    VALUES (application_id, sender_id, message_text, true)
    RETURNING id INTO v_message_id;
  ELSIF v_application_type = 'unit' THEN
    INSERT INTO messages (unit_application_id, sender_id, message_text, created_by_tenant)
    VALUES (application_id, sender_id, message_text, true)
    RETURNING id INTO v_message_id;
  ELSIF v_application_type = 'property' THEN
    INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant)
    VALUES (application_id, sender_id, message_text, true)
    RETURNING id INTO v_message_id;
  ELSE
    RETURN QUERY SELECT false, NULL::uuid, 'Unknown application type'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_message_id, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;