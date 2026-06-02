-- Fix send_tenant_message function to use owner_id instead of landlord_id
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

  -- Insert the message
  INSERT INTO application_messages (
    application_id,
    sender_id,
    receiver_id,
    message_text,
    payload,
    is_from_landlord
  ) VALUES (
    application_id,
    sender_id,
    v_landlord_id,
    message_text,
    p_payload,
    false
  ) RETURNING id INTO v_new_message_id;

  -- Increment message count if not primary applicant
  IF NOT v_is_primary THEN
    INSERT INTO application_message_counts (application_id, user_id, message_count)
    VALUES (application_id, sender_id, 1)
    ON CONFLICT (application_id, user_id)
    DO UPDATE SET message_count = application_message_counts.message_count + 1;
  END IF;

  RETURN QUERY SELECT true, v_new_message_id, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;