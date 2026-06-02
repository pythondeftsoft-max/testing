-- Fix notify_new_message function to properly construct names from first_name and last_name
-- The profiles table doesn't have a full_name column

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_recipient_id UUID;
  v_recipient_email TEXT;
  v_recipient_name TEXT;
  v_property_address TEXT;
  v_application RECORD;
BEGIN
  -- Get application details including owner_id from properties
  SELECT pa.*, p.address, p.owner_id
  INTO v_application
  FROM property_applications pa
  JOIN properties p ON p.id = pa.property_id
  WHERE pa.id = NEW.property_application_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  v_property_address := v_application.address;
  
  -- Determine recipient (the person who DIDN'T send the message)
  IF NEW.sender_id = v_application.tenant_id THEN
    -- Message from tenant to landlord (use owner_id, not landlord_id)
    v_recipient_id := v_application.owner_id;
  ELSE
    -- Message from landlord to tenant
    v_recipient_id := v_application.tenant_id;
  END IF;
  
  -- Get sender name (construct from first_name and last_name)
  SELECT COALESCE(NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''), email)
  INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Get recipient email and name (construct from first_name and last_name)
  SELECT email, COALESCE(NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''), email)
  INTO v_recipient_email, v_recipient_name
  FROM profiles
  WHERE id = v_recipient_id;
  
  -- Create notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link,
    metadata
  ) VALUES (
    v_recipient_id,
    'new_message',
    'New Message from ' || v_sender_name,
    NEW.message_text,
    '/messages?application=' || NEW.property_application_id,
    jsonb_build_object(
      'sender_id', NEW.sender_id,
      'sender_name', v_sender_name,
      'property_address', v_property_address,
      'application_id', NEW.property_application_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;