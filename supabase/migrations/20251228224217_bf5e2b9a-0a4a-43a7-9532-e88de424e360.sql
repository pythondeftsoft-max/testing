-- Add property_push_id column to messages table for push-based messaging
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS property_push_id uuid REFERENCES property_pushes(id);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_messages_property_push_id ON messages(property_push_id);

-- Update send_landlord_message to support property_pushes
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
  v_application_type TEXT;
BEGIN
  -- Determine application type including property_pushes
  IF EXISTS (SELECT 1 FROM marketplace_applications WHERE id = application_id) THEN
    v_application_type := 'marketplace';
  ELSIF EXISTS (SELECT 1 FROM unit_applications WHERE id = application_id) THEN
    v_application_type := 'unit';
  ELSIF EXISTS (SELECT 1 FROM property_applications WHERE id = application_id) THEN
    v_application_type := 'property';
  ELSIF EXISTS (SELECT 1 FROM property_pushes WHERE id = application_id) THEN
    v_application_type := 'push';
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Application not found'::TEXT;
    RETURN;
  END IF;

  -- For push-type applications, skip quota check (landlord initiating contact)
  -- For other types, check quota
  IF v_application_type != 'push' THEN
    SELECT lq.can_message, lq.messages_remaining, lq.reason 
    INTO v_can_message, v_messages_remaining, v_reason
    FROM check_landlord_messaging_quota(application_id, sender_id) lq;

    IF NOT v_can_message THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, v_reason;
      RETURN;
    END IF;
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
  ELSIF v_application_type = 'push' THEN
    INSERT INTO messages (property_push_id, sender_id, message_text, created_by_tenant, payload, read_by_tenant, read_by_landlord)
    VALUES (application_id, sender_id, message_text, FALSE, p_payload, FALSE, TRUE)
    RETURNING id INTO v_message_id;
  END IF;

  RETURN QUERY SELECT TRUE, v_message_id, NULL::TEXT;
END;
$$;

-- Update send_tenant_message to support property_pushes
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
  -- Determine application type including property_pushes
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
    
  ELSIF EXISTS (SELECT 1 FROM property_pushes WHERE id = application_id) THEN
    v_application_type := 'push';
    -- For pushes, check if tenant owns this push and get property info
    SELECT pp.unit_id, pu.property_id 
    INTO v_unit_id, v_property_id
    FROM property_pushes pp
    JOIN property_units pu ON pp.unit_id = pu.id
    WHERE pp.id = application_id AND pp.tenant_id = sender_id;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT false, NULL::uuid, 'Application not found or unauthorized';
      RETURN;
    END IF;
    
    SELECT owner_id INTO v_landlord_id FROM properties WHERE id = v_property_id;
    
    -- For push applications, treat as primary (interested tenant can message freely)
    v_is_primary := TRUE;
  ELSE
    RETURN QUERY SELECT false, NULL::uuid, 'Application not found';
    RETURN;
  END IF;

  -- Check quota: unlimited for primary applicants, use quota check for non-primary
  IF v_is_primary THEN
    v_can_message := TRUE;
    v_messages_remaining := 999999;
  ELSE
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
      sender_id, message_text, payload, created_by_tenant,
      marketplace_application_id, read_by_tenant, read_by_landlord
    ) VALUES (
      sender_id, message_text, p_payload, true,
      application_id, true, false
    ) RETURNING id INTO v_new_message_id;
  ELSIF v_application_type = 'unit' THEN
    INSERT INTO messages (
      sender_id, message_text, payload, created_by_tenant,
      unit_application_id, read_by_tenant, read_by_landlord
    ) VALUES (
      sender_id, message_text, p_payload, true,
      application_id, true, false
    ) RETURNING id INTO v_new_message_id;
  ELSIF v_application_type = 'property' THEN
    INSERT INTO messages (
      sender_id, message_text, payload, created_by_tenant,
      property_application_id, read_by_tenant, read_by_landlord
    ) VALUES (
      sender_id, message_text, p_payload, true,
      application_id, true, false
    ) RETURNING id INTO v_new_message_id;
  ELSIF v_application_type = 'push' THEN
    INSERT INTO messages (
      sender_id, message_text, payload, created_by_tenant,
      property_push_id, read_by_tenant, read_by_landlord
    ) VALUES (
      sender_id, message_text, p_payload, true,
      application_id, true, false
    ) RETURNING id INTO v_new_message_id;
  END IF;

  RETURN QUERY SELECT true, v_new_message_id, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update check_landlord_messaging_quota to handle push applications
CREATE OR REPLACE FUNCTION check_landlord_messaging_quota(
  p_application_id uuid,
  p_landlord_id uuid
)
RETURNS TABLE (
  can_message boolean,
  messages_remaining integer,
  reason text
) AS $$
DECLARE
  v_tenant_id uuid;
  v_property_id uuid;
  v_unit_id uuid;
BEGIN
  -- Try to find tenant from different application types
  SELECT ma.user_id, pu.property_id, ma.unit_id
  INTO v_tenant_id, v_property_id, v_unit_id
  FROM marketplace_applications ma
  JOIN property_units pu ON ma.unit_id = pu.id
  WHERE ma.id = p_application_id;
  
  IF NOT FOUND THEN
    SELECT ua.tenant_id, pu.property_id, ua.unit_id
    INTO v_tenant_id, v_property_id, v_unit_id
    FROM unit_applications ua
    JOIN property_units pu ON ua.unit_id = pu.id
    WHERE ua.id = p_application_id;
  END IF;
  
  IF NOT FOUND THEN
    SELECT pa.tenant_id, pa.property_id
    INTO v_tenant_id, v_property_id
    FROM property_applications pa
    WHERE pa.id = p_application_id;
  END IF;
  
  IF NOT FOUND THEN
    -- Check property_pushes
    SELECT pp.tenant_id, pu.property_id, pp.unit_id
    INTO v_tenant_id, v_property_id, v_unit_id
    FROM property_pushes pp
    JOIN property_units pu ON pp.unit_id = pu.id
    WHERE pp.id = p_application_id;
  END IF;
  
  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 'Application not found';
    RETURN;
  END IF;
  
  -- Verify landlord owns the property
  IF NOT EXISTS (
    SELECT 1 FROM properties WHERE id = v_property_id AND owner_id = p_landlord_id
  ) THEN
    RETURN QUERY SELECT false, 0, 'Unauthorized: You do not own this property';
    RETURN;
  END IF;
  
  -- Landlords have unlimited messaging
  RETURN QUERY SELECT true, 999999, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;