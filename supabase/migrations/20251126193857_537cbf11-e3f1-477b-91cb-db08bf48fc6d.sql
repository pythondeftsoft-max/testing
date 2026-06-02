-- Fix send_tenant_message to use correct tables and columns
CREATE OR REPLACE FUNCTION send_tenant_message(
  application_id uuid,
  message_text text,
  sender_id uuid,
  p_payload jsonb DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  message_id uuid,
  error_message text
) AS $$
DECLARE
  v_is_primary boolean;
  v_property_id uuid;
  v_unit_id uuid;
  v_landlord_id uuid;
  v_messages_remaining integer;
  v_new_message_id uuid;
  v_application_type text;
BEGIN
  -- Determine application type and get is_primary_applicant status
  IF EXISTS (SELECT 1 FROM marketplace_applications WHERE id = application_id) THEN
    v_application_type := 'marketplace';
    SELECT is_primary_applicant INTO v_is_primary 
    FROM marketplace_applications 
    WHERE id = application_id AND user_id = sender_id;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT false, NULL::uuid, 'Application not found or unauthorized';
      RETURN;
    END IF;
    
    SELECT unit_id INTO v_unit_id FROM marketplace_applications WHERE id = application_id;
    SELECT property_id INTO v_property_id FROM property_units WHERE id = v_unit_id;
    SELECT owner_id INTO v_landlord_id FROM properties WHERE id = v_property_id;
    
  ELSIF EXISTS (SELECT 1 FROM unit_applications WHERE id = application_id) THEN
    v_application_type := 'unit';
    SELECT is_primary_applicant INTO v_is_primary 
    FROM unit_applications 
    WHERE id = application_id AND tenant_id = sender_id;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT false, NULL::uuid, 'Application not found or unauthorized';
      RETURN;
    END IF;
    
    SELECT unit_id INTO v_unit_id FROM unit_applications WHERE id = application_id;
    SELECT property_id INTO v_property_id FROM property_units WHERE id = v_unit_id;
    SELECT owner_id INTO v_landlord_id FROM properties WHERE id = v_property_id;
    
  ELSIF EXISTS (SELECT 1 FROM property_applications WHERE id = application_id) THEN
    v_application_type := 'property';
    SELECT is_primary_applicant INTO v_is_primary 
    FROM property_applications 
    WHERE id = application_id AND tenant_id = sender_id;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT false, NULL::uuid, 'Application not found or unauthorized';
      RETURN;
    END IF;
    
    SELECT property_id INTO v_property_id FROM property_applications WHERE id = application_id;
    SELECT owner_id INTO v_landlord_id FROM properties WHERE id = v_property_id;
  ELSE
    RETURN QUERY SELECT false, NULL::uuid, 'Application not found';
    RETURN;
  END IF;

  -- Check quota: unlimited for primary applicants, limited for non-primary
  IF v_is_primary THEN
    v_messages_remaining := 999999;
  ELSE
    SELECT can_message, messages_remaining INTO v_is_primary, v_messages_remaining
    FROM check_messaging_quota(application_id, sender_id);
    
    IF NOT v_is_primary THEN
      RETURN QUERY SELECT false, NULL::uuid, 'Message quota exceeded';
      RETURN;
    END IF;
  END IF;

  -- Insert the message into the correct table based on application type
  IF v_application_type = 'marketplace' THEN
    INSERT INTO messages (
      sender_id,
      message_text,
      payload,
      created_by_tenant,
      marketplace_application_id,
      read_by_tenant,
      read_by_landlord
    ) VALUES (
      sender_id,
      message_text,
      p_payload,
      true,
      application_id,
      true,
      false
    ) RETURNING id INTO v_new_message_id;
  ELSIF v_application_type = 'unit' THEN
    INSERT INTO messages (
      sender_id,
      message_text,
      payload,
      created_by_tenant,
      unit_application_id,
      read_by_tenant,
      read_by_landlord
    ) VALUES (
      sender_id,
      message_text,
      p_payload,
      true,
      application_id,
      true,
      false
    ) RETURNING id INTO v_new_message_id;
  ELSIF v_application_type = 'property' THEN
    INSERT INTO messages (
      sender_id,
      message_text,
      payload,
      created_by_tenant,
      property_application_id,
      read_by_tenant,
      read_by_landlord
    ) VALUES (
      sender_id,
      message_text,
      p_payload,
      true,
      application_id,
      true,
      false
    ) RETURNING id INTO v_new_message_id;
  END IF;

  -- Increment message count if not primary applicant using message_limits table
  IF NOT v_is_primary THEN
    INSERT INTO message_limits (property_application_id, tenant_id, messages_sent)
    VALUES (application_id, sender_id, 1)
    ON CONFLICT (property_application_id, tenant_id)
    DO UPDATE SET messages_sent = message_limits.messages_sent + 1;
  END IF;

  RETURN QUERY SELECT true, v_new_message_id, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;