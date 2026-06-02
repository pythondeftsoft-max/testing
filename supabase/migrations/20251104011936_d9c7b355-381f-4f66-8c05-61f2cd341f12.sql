-- Fix security warnings for message notification trigger functions
-- Add SET search_path to SECURITY DEFINER functions

-- Update notify_new_message function to include search_path
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_recipient_id UUID;
  v_recipient_email TEXT;
  v_recipient_name TEXT;
  v_property_address TEXT;
  v_application RECORD;
BEGIN
  -- Get application details to find the other party
  SELECT pa.*, p.address
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
    -- Message from tenant to landlord
    v_recipient_id := v_application.landlord_id;
  ELSE
    -- Message from landlord to tenant
    v_recipient_id := v_application.tenant_id;
  END IF;
  
  -- Get sender name
  SELECT COALESCE(first_name || ' ' || last_name, email, 'User')
  INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Get recipient email and name
  SELECT email, COALESCE(first_name || ' ' || last_name, email, 'User')
  INTO v_recipient_email, v_recipient_name
  FROM profiles
  WHERE id = v_recipient_id;
  
  -- Create in-app notification
  PERFORM send_notification(
    v_recipient_id,
    '💬 New Message from ' || v_sender_name,
    LEFT(NEW.message_text, 100) || CASE WHEN LENGTH(NEW.message_text) > 100 THEN '...' ELSE '' END,
    'message',
    CASE 
      WHEN NEW.extension = 'maintenance' THEN 'high'
      WHEN NEW.extension = 'appointment' THEN 'high'
      ELSE 'medium'
    END,
    'Messages',
    '/messages?applicationId=' || NEW.property_application_id,
    'view_message',
    jsonb_build_object(
      'message_id', NEW.id,
      'application_id', NEW.property_application_id,
      'sender_id', NEW.sender_id
    ),
    'message',
    NEW.id
  );
  
  -- Queue email notification
  INSERT INTO email_queue (
    user_id,
    to_email,
    subject,
    body,
    link,
    category,
    email_type,
    status
  ) VALUES (
    v_recipient_id,
    v_recipient_email,
    'New message from ' || v_sender_name,
    'Hi ' || v_recipient_name || ',

You have received a new message regarding ' || v_property_address || '

From: ' || v_sender_name || '

Message: ' || LEFT(NEW.message_text, 200) || CASE WHEN LENGTH(NEW.message_text) > 200 THEN '...' ELSE '' END || '

Click the button below to view and reply to this message.',
    current_setting('app.settings.app_url', true) || '/messages?applicationId=' || NEW.property_application_id,
    'Messages',
    'message_notification',
    'pending'
  );
  
  RETURN NEW;
END;
$$;

-- Update notify_admin_message function to include search_path
CREATE OR REPLACE FUNCTION notify_admin_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_name TEXT;
  v_recipient RECORD;
  v_message_type_icon TEXT;
  v_priority TEXT;
  v_app_url TEXT;
BEGIN
  -- Get app URL
  v_app_url := current_setting('app.settings.app_url', true);
  
  -- Get admin sender name
  SELECT COALESCE(first_name || ' ' || last_name, email, 'Admin')
  INTO v_admin_name
  FROM profiles
  WHERE id = NEW.admin_user_id;
  
  -- Determine icon and priority based on message type
  CASE NEW.message_type
    WHEN 'urgent' THEN
      v_message_type_icon := '🚨';
      v_priority := 'urgent';
    WHEN 'maintenance' THEN
      v_message_type_icon := '🔧';
      v_priority := 'high';
    WHEN 'appointment' THEN
      v_message_type_icon := '📅';
      v_priority := 'high';
    WHEN 'billing' THEN
      v_message_type_icon := '💳';
      v_priority := 'medium';
    WHEN 'inspection' THEN
      v_message_type_icon := '🔍';
      v_priority := 'medium';
    WHEN 'announcement' THEN
      v_message_type_icon := '📢';
      v_priority := 'low';
    ELSE
      v_message_type_icon := '📬';
      v_priority := 'medium';
  END CASE;
  
  -- Handle individual message
  IF NEW.recipient_user_id IS NOT NULL THEN
    -- Get recipient details
    SELECT id, email, COALESCE(first_name || ' ' || last_name, email, 'User') as name
    INTO v_recipient
    FROM profiles
    WHERE id = NEW.recipient_user_id;
    
    -- Create in-app notification
    PERFORM send_notification(
      v_recipient.id,
      v_message_type_icon || ' ' || NEW.subject,
      LEFT(NEW.message_text, 100) || CASE WHEN LENGTH(NEW.message_text) > 100 THEN '...' ELSE '' END,
      'admin_message',
      v_priority,
      'Admin Communications',
      '/admin-messages',
      'view_admin_message',
      jsonb_build_object('message_id', NEW.id),
      'admin_message',
      NEW.id
    );
    
    -- Queue email
    INSERT INTO email_queue (
      user_id,
      to_email,
      subject,
      body,
      link,
      category,
      email_type,
      status
    ) VALUES (
      v_recipient.id,
      v_recipient.email,
      v_message_type_icon || ' ' || NEW.subject,
      'Hi ' || v_recipient.name || ',

You have received a message from the OpenKey admin team:

Subject: ' || NEW.subject || '

Message: ' || NEW.message_text || '

' || CASE WHEN NEW.attachment_url IS NOT NULL THEN 'This message includes an attachment. ' ELSE '' END || 'Click the button below to view the full message and any attachments.',
      v_app_url || '/admin-messages',
      'Admin Communications',
      'admin_message',
      'pending'
    );
    
  -- Handle bulk message (recipient_group)
  ELSIF NEW.recipient_group IS NOT NULL THEN
    -- Loop through all matching users based on recipient_group
    FOR v_recipient IN
      SELECT id, email, COALESCE(first_name || ' ' || last_name, email, 'User') as name
      FROM profiles
      WHERE 
        user_type != 'admin'
        AND (
          (NEW.recipient_group = 'all') OR
          (NEW.recipient_group = 'landlords' AND user_type IN ('landlord', 'individual_owner')) OR
          (NEW.recipient_group = 'tenants' AND user_type = 'tenant')
        )
    LOOP
      -- Create in-app notification for each recipient
      PERFORM send_notification(
        v_recipient.id,
        v_message_type_icon || ' ' || NEW.subject,
        LEFT(NEW.message_text, 100) || CASE WHEN LENGTH(NEW.message_text) > 100 THEN '...' ELSE '' END,
        'admin_message',
        v_priority,
        'Admin Communications',
        '/admin-messages',
        'view_admin_message',
        jsonb_build_object('message_id', NEW.id, 'bulk', true),
        'admin_message',
        NEW.id
      );
      
      -- Queue email for each recipient
      INSERT INTO email_queue (
        user_id,
        to_email,
        subject,
        body,
        link,
        category,
        email_type,
        status
      ) VALUES (
        v_recipient.id,
        v_recipient.email,
        v_message_type_icon || ' ' || NEW.subject,
        'Hi ' || v_recipient.name || ',

You have received a message from the OpenKey admin team:

Subject: ' || NEW.subject || '

Message: ' || NEW.message_text || '

' || CASE WHEN NEW.attachment_url IS NOT NULL THEN 'This message includes an attachment. ' ELSE '' END || 'Click the button below to view the full message and any attachments.',
        v_app_url || '/admin-messages',
        'Admin Communications',
        'admin_message',
        'pending'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;