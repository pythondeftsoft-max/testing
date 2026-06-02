-- Fix send_landlord_message to properly parse JSON quota response and use correct application ID columns
CREATE OR REPLACE FUNCTION public.send_landlord_message(
  application_id uuid, 
  message_text text, 
  sender_id uuid, 
  p_payload jsonb DEFAULT NULL
)
RETURNS TABLE(success boolean, message_id uuid, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id UUID;
  v_can_message BOOLEAN;
  v_messages_remaining INTEGER;
  v_reason TEXT;
  v_quota_result RECORD;
  v_application_type TEXT;
BEGIN
  -- Check landlord messaging quota first - returns a table row, not JSON
  SELECT lq.can_message, lq.messages_remaining, lq.reason 
  INTO v_can_message, v_messages_remaining, v_reason
  FROM check_landlord_messaging_quota(application_id, sender_id) lq;

  IF NOT v_can_message THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, v_reason;
    RETURN;
  END IF;

  -- Determine application type
  IF EXISTS (SELECT 1 FROM marketplace_applications WHERE id = application_id) THEN
    v_application_type := 'marketplace';
  ELSIF EXISTS (SELECT 1 FROM unit_applications WHERE id = application_id) THEN
    v_application_type := 'unit';
  ELSIF EXISTS (SELECT 1 FROM property_applications WHERE id = application_id) THEN
    v_application_type := 'property';
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Application not found'::TEXT;
    RETURN;
  END IF;

  -- Insert message with the correct application_id column based on type
  IF v_application_type = 'marketplace' THEN
    INSERT INTO messages (marketplace_application_id, sender_id, message_text, created_by_tenant, payload, read_by_tenant, read_by_landlord)
    VALUES (application_id, sender_id, message_text, FALSE, p_payload, FALSE, TRUE)
    RETURNING id INTO v_message_id;
  ELSIF v_application_type = 'unit' THEN
    INSERT INTO messages (unit_application_id, sender_id, message_text, created_by_tenant, payload, read_by_tenant, read_by_landlord)
    VALUES (application_id, sender_id, message_text, FALSE, p_payload, FALSE, TRUE)
    RETURNING id INTO v_message_id;
  ELSIF v_application_type = 'property' THEN
    INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant, payload, read_by_tenant, read_by_landlord)
    VALUES (application_id, sender_id, message_text, FALSE, p_payload, FALSE, TRUE)
    RETURNING id INTO v_message_id;
  END IF;

  RETURN QUERY SELECT TRUE, v_message_id, NULL::TEXT;
END;
$$;

-- Fix send_tenant_message to properly call quota check function (it returns TABLE, not columns)
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
  v_can_message boolean;
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

  -- Check quota: unlimited for primary applicants, use quota check for non-primary
  IF v_is_primary THEN
    v_can_message := TRUE;
    v_messages_remaining := 999999;
  ELSE
    -- Properly call the check_messaging_quota function which returns a TABLE
    SELECT cq.can_message, cq.messages_remaining INTO v_can_message, v_messages_remaining
    FROM check_messaging_quota(application_id, sender_id) cq;
    
    IF NOT v_can_message THEN
      RETURN QUERY SELECT false, NULL::uuid, 'Message quota exceeded or waiting for landlord response';
      RETURN;
    END IF;
  END IF;

  -- Insert the message into the correct column based on application type
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

  RETURN QUERY SELECT true, v_new_message_id, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;