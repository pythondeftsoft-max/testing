-- Add support for marketplace and unit applications in messages table
ALTER TABLE messages 
ADD COLUMN marketplace_application_id UUID REFERENCES marketplace_applications(id) ON DELETE CASCADE,
ADD COLUMN unit_application_id UUID REFERENCES unit_applications(id) ON DELETE CASCADE;

-- Make property_application_id nullable to support the other types
ALTER TABLE messages ALTER COLUMN property_application_id DROP NOT NULL;

-- Add constraint to ensure exactly ONE application type is set
ALTER TABLE messages 
ADD CONSTRAINT messages_one_application_id_required 
CHECK (
  (marketplace_application_id IS NOT NULL)::int + 
  (unit_application_id IS NOT NULL)::int + 
  (property_application_id IS NOT NULL)::int = 1
);

-- Create helper function to determine application type
CREATE OR REPLACE FUNCTION get_application_type(p_application_id UUID)
RETURNS TEXT AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM marketplace_applications WHERE id = p_application_id) THEN
    RETURN 'marketplace';
  ELSIF EXISTS (SELECT 1 FROM unit_applications WHERE id = p_application_id) THEN
    RETURN 'unit';
  ELSIF EXISTS (SELECT 1 FROM property_applications WHERE id = p_application_id) THEN
    RETURN 'property';
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update send_tenant_message to support all application types
CREATE OR REPLACE FUNCTION public.send_tenant_message(
  application_id uuid,
  message_text text,
  sender_id uuid
)
RETURNS TABLE(success boolean, message_id uuid, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_landlord_id UUID;
  v_is_primary BOOLEAN;
  v_landlord_message_count INTEGER;
  v_max_landlord_messages INTEGER := 5;
  v_new_message_id UUID;
  v_app_type TEXT;
BEGIN
  -- Determine application type
  v_app_type := get_application_type(application_id);
  
  IF v_app_type IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Application not found'::TEXT;
    RETURN;
  END IF;

  -- Get landlord_id and is_primary based on application type
  IF v_app_type = 'marketplace' THEN
    SELECT landlord_id, is_primary_applicant INTO v_landlord_id, v_is_primary
    FROM marketplace_applications
    WHERE id = application_id;
  ELSIF v_app_type = 'unit' THEN
    SELECT landlord_id, is_primary_applicant INTO v_landlord_id, v_is_primary
    FROM unit_applications
    WHERE id = application_id;
  ELSE -- property
    SELECT landlord_id, is_primary_applicant INTO v_landlord_id, v_is_primary
    FROM property_applications
    WHERE id = application_id;
  END IF;

  -- Verify sender is the landlord
  IF sender_id != v_landlord_id THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Unauthorized: Only landlord can send messages'::TEXT;
    RETURN;
  END IF;

  -- Check if primary applicant (unlimited messaging)
  IF v_is_primary THEN
    -- Insert message with correct application column
    IF v_app_type = 'marketplace' THEN
      INSERT INTO messages (marketplace_application_id, sender_id, message_text, created_by_tenant, message_context)
      VALUES (application_id, v_landlord_id, message_text, FALSE, 'application')
      RETURNING id INTO v_new_message_id;
    ELSIF v_app_type = 'unit' THEN
      INSERT INTO messages (unit_application_id, sender_id, message_text, created_by_tenant, message_context)
      VALUES (application_id, v_landlord_id, message_text, FALSE, 'application')
      RETURNING id INTO v_new_message_id;
    ELSE -- property
      INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant, message_context)
      VALUES (application_id, v_landlord_id, message_text, FALSE, 'application')
      RETURNING id INTO v_new_message_id;
    END IF;
    
    RETURN QUERY SELECT TRUE, v_new_message_id, 'Message sent successfully'::TEXT;
    RETURN;
  END IF;

  -- Count APPLICATION context messages from landlord across all application types
  SELECT COUNT(*) INTO v_landlord_message_count
  FROM messages
  WHERE (
    marketplace_application_id = application_id OR
    unit_application_id = application_id OR
    property_application_id = application_id
  )
  AND created_by_tenant = FALSE
  AND message_context = 'application';

  -- Check if landlord has reached the 5-message limit
  IF v_landlord_message_count >= v_max_landlord_messages THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Message limit reached for non-primary applicants'::TEXT;
    RETURN;
  END IF;

  -- Insert message with correct application column
  IF v_app_type = 'marketplace' THEN
    INSERT INTO messages (marketplace_application_id, sender_id, message_text, created_by_tenant, message_context)
    VALUES (application_id, v_landlord_id, message_text, FALSE, 'application')
    RETURNING id INTO v_new_message_id;
  ELSIF v_app_type = 'unit' THEN
    INSERT INTO messages (unit_application_id, sender_id, message_text, created_by_tenant, message_context)
    VALUES (application_id, v_landlord_id, message_text, FALSE, 'application')
    RETURNING id INTO v_new_message_id;
  ELSE -- property
    INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant, message_context)
    VALUES (application_id, v_landlord_id, message_text, FALSE, 'application')
    RETURNING id INTO v_new_message_id;
  END IF;

  RETURN QUERY SELECT TRUE, v_new_message_id, 'Message sent successfully'::TEXT;
END;
$function$;

-- Update check_messaging_quota to count messages from all application types
CREATE OR REPLACE FUNCTION public.check_messaging_quota(p_application_id uuid, p_user_id uuid)
RETURNS TABLE(can_message boolean, messages_remaining integer, reason text, is_primary boolean)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_is_primary BOOLEAN := FALSE;
  v_landlord_message_count INTEGER;
  v_max_landlord_messages INTEGER := 5;
BEGIN
  -- Check marketplace_applications first (most common)
  SELECT is_primary_applicant INTO v_is_primary
  FROM marketplace_applications
  WHERE id = p_application_id;
  
  -- If not found, check unit_applications
  IF v_is_primary IS NULL THEN
    SELECT is_primary_applicant INTO v_is_primary
    FROM unit_applications
    WHERE id = p_application_id;
  END IF;
  
  -- If still not found, check property_applications
  IF v_is_primary IS NULL THEN
    SELECT is_primary_applicant INTO v_is_primary
    FROM property_applications
    WHERE id = p_application_id;
  END IF;
  
  -- If application not found in any table, return error
  IF v_is_primary IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Application not found'::TEXT, FALSE;
    RETURN;
  END IF;

  -- If primary applicant, unlimited messaging
  IF v_is_primary THEN
    RETURN QUERY SELECT TRUE, 999999, 'Primary applicant - unlimited messaging'::TEXT, TRUE;
    RETURN;
  END IF;

  -- Count APPLICATION context messages from landlord across all application types
  SELECT COUNT(*) INTO v_landlord_message_count
  FROM messages
  WHERE (
    marketplace_application_id = p_application_id OR
    unit_application_id = p_application_id OR
    property_application_id = p_application_id
  )
  AND created_by_tenant = FALSE
  AND message_context = 'application';

  -- Check if landlord has reached the 5-message limit
  IF v_landlord_message_count >= v_max_landlord_messages THEN
    RETURN QUERY SELECT FALSE, 0, 'Message limit reached - set as primary for unlimited messaging'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Return remaining message count
  RETURN QUERY SELECT 
    TRUE, 
    (v_max_landlord_messages - v_landlord_message_count)::INTEGER,
    'Messages remaining'::TEXT,
    FALSE;
END;
$function$;