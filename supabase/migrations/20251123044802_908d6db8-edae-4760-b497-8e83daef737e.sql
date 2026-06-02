-- Primary Applicant System: Database Foundation
-- This migration implements the core database logic for Primary Applicant management

-- 1. Add archived flag to messages for chat closure
ALTER TABLE messages ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- 2. Add conversation_blocked flag to message_limits
ALTER TABLE message_limits ADD COLUMN IF NOT EXISTS conversation_blocked BOOLEAN DEFAULT FALSE;

-- 3. Update landlord_set_primary_applicant to support replacing existing Primary
CREATE OR REPLACE FUNCTION landlord_set_primary_applicant(
  p_unit_id UUID,
  p_tenant_id UUID,
  p_landlord_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_property_id UUID;
  v_current_primary_id UUID;
  v_current_primary_name TEXT;
  v_property_address TEXT;
  v_unit_number TEXT;
  v_new_tenant_name TEXT;
BEGIN
  -- Get property and current Primary info
  SELECT 
    pu.property_id,
    pu.primary_applicant_tenant_id,
    pu.unit_number,
    p.address
  INTO v_property_id, v_current_primary_id, v_unit_number, v_property_address
  FROM property_units pu
  JOIN properties p ON p.id = pu.property_id
  WHERE pu.id = p_unit_id AND p.landlord_id = p_landlord_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Unit not found or access denied';
  END IF;

  -- Get names for notifications
  IF v_current_primary_id IS NOT NULL THEN
    SELECT CONCAT(first_name, ' ', last_name) INTO v_current_primary_name
    FROM profiles WHERE id = v_current_primary_id;
  END IF;

  SELECT CONCAT(first_name, ' ', last_name) INTO v_new_tenant_name
  FROM profiles WHERE id = p_tenant_id;

  -- If replacing existing Primary, deny them first
  IF v_current_primary_id IS NOT NULL AND v_current_primary_id != p_tenant_id THEN
    -- Update old Primary application to withdrawn
    UPDATE marketplace_applications
    SET status = 'withdrawn',
        updated_at = NOW()
    WHERE tenant_id = v_current_primary_id 
      AND unit_id = p_unit_id
      AND status NOT IN ('withdrawn', 'rejected');

    -- Archive chat with old Primary
    UPDATE messages
    SET archived = TRUE
    WHERE (sender_id = p_landlord_id AND recipient_id = v_current_primary_id)
       OR (sender_id = v_current_primary_id AND recipient_id = p_landlord_id);

    -- Block conversation with old Primary
    UPDATE message_limits
    SET conversation_blocked = TRUE
    WHERE (user_id = p_landlord_id AND other_user_id = v_current_primary_id)
       OR (user_id = v_current_primary_id AND other_user_id = p_landlord_id);

    -- Notify old Primary they were replaced
    INSERT INTO notifications (user_id, title, message, type, related_id)
    VALUES (
      v_current_primary_id,
      'Application Status Update',
      'Your application for ' || v_property_address || ' is no longer being considered. The landlord has chosen a different applicant.',
      'application_status',
      p_unit_id
    );
  END IF;

  -- Set new Primary
  UPDATE property_units
  SET primary_applicant_tenant_id = p_tenant_id,
      pipeline_stage = 'in_process',
      on_market = FALSE,
      updated_at = NOW()
  WHERE id = p_unit_id;

  -- Update property market status
  UPDATE properties
  SET on_market = FALSE,
      updated_at = NOW()
  WHERE id = v_property_id;

  -- Update new Primary application status
  UPDATE marketplace_applications
  SET status = 'approved',
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id 
    AND unit_id = p_unit_id;

  -- Reset message limits for Primary (unlimited messaging)
  DELETE FROM message_limits
  WHERE (user_id = p_landlord_id AND other_user_id = p_tenant_id)
     OR (user_id = p_tenant_id AND other_user_id = p_landlord_id);

  -- Notify new Primary
  INSERT INTO notifications (user_id, title, message, type, related_id)
  VALUES (
    p_tenant_id,
    'You have been selected as Primary Applicant!',
    'Congratulations! You have been selected as the Primary Applicant for ' || v_property_address || '. You can now message the landlord without limits.',
    'application_status',
    p_unit_id
  );

  RETURN json_build_object(
    'success', TRUE,
    'message', 'Primary applicant set successfully',
    'previous_primary_denied', v_current_primary_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update landlord_reject_primary_applicant for proper cleanup
CREATE OR REPLACE FUNCTION landlord_reject_primary_applicant(
  p_unit_id UUID,
  p_landlord_id UUID,
  p_reason TEXT DEFAULT 'Not a fit'
)
RETURNS JSON AS $$
DECLARE
  v_property_id UUID;
  v_primary_tenant_id UUID;
  v_property_address TEXT;
  v_application_count INTEGER;
BEGIN
  -- Get unit and Primary info
  SELECT 
    pu.property_id,
    pu.primary_applicant_tenant_id,
    p.address
  INTO v_property_id, v_primary_tenant_id, v_property_address
  FROM property_units pu
  JOIN properties p ON p.id = pu.property_id
  WHERE pu.id = p_unit_id AND p.landlord_id = p_landlord_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Unit not found or access denied';
  END IF;

  IF v_primary_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No Primary applicant to reject';
  END IF;

  -- Update Primary application to withdrawn
  UPDATE marketplace_applications
  SET status = 'withdrawn',
      updated_at = NOW()
  WHERE tenant_id = v_primary_tenant_id 
    AND unit_id = p_unit_id
    AND status NOT IN ('withdrawn', 'rejected');

  -- Archive chat
  UPDATE messages
  SET archived = TRUE
  WHERE (sender_id = p_landlord_id AND recipient_id = v_primary_tenant_id)
     OR (sender_id = v_primary_tenant_id AND recipient_id = p_landlord_id);

  -- Block conversation
  UPDATE message_limits
  SET conversation_blocked = TRUE
  WHERE (user_id = p_landlord_id AND other_user_id = v_primary_tenant_id)
     OR (user_id = v_primary_tenant_id AND other_user_id = p_landlord_id);

  -- Clear Primary and return to assigned stage
  UPDATE property_units
  SET primary_applicant_tenant_id = NULL,
      pipeline_stage = 'assigned',
      updated_at = NOW()
  WHERE id = p_unit_id;

  -- Check remaining application count
  SELECT COUNT(*) INTO v_application_count
  FROM marketplace_applications
  WHERE unit_id = p_unit_id
    AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

  -- Unpause listing if under limit (6)
  IF v_application_count < 6 THEN
    UPDATE property_units
    SET on_market = TRUE
    WHERE id = p_unit_id;

    UPDATE properties
    SET on_market = TRUE
    WHERE id = v_property_id;
  END IF;

  -- Notify rejected Primary
  INSERT INTO notifications (user_id, title, message, type, related_id)
  VALUES (
    v_primary_tenant_id,
    'Application Status Update',
    'Your application for ' || v_property_address || ' is no longer being considered. Reason: ' || p_reason,
    'application_status',
    p_unit_id
  );

  RETURN json_build_object(
    'success', TRUE,
    'message', 'Primary applicant rejected',
    'listing_reopened', v_application_count < 6
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to check application limit
CREATE OR REPLACE FUNCTION check_unit_application_limit(p_unit_id UUID)
RETURNS JSON AS $$
DECLARE
  v_current_count INTEGER;
  v_max_allowed INTEGER := 6;
BEGIN
  SELECT COUNT(*) INTO v_current_count
  FROM marketplace_applications
  WHERE unit_id = p_unit_id
    AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

  RETURN json_build_object(
    'can_accept', v_current_count < v_max_allowed,
    'current_count', v_current_count,
    'max_allowed', v_max_allowed,
    'is_at_limit', v_current_count >= v_max_allowed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Drop and recreate check_messaging_quota with new return type
DROP FUNCTION IF EXISTS check_messaging_quota(UUID, UUID);

CREATE FUNCTION check_messaging_quota(
  p_user_id UUID,
  p_application_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_is_primary BOOLEAN := FALSE;
  v_unit_id UUID;
  v_tenant_id UUID;
  v_landlord_id UUID;
  v_landlord_message_count INTEGER;
  v_conversation_blocked BOOLEAN := FALSE;
  v_max_landlord_messages INTEGER := 3;
BEGIN
  -- Get application details
  SELECT unit_id, tenant_id INTO v_unit_id, v_tenant_id
  FROM marketplace_applications
  WHERE id = p_application_id;

  IF v_unit_id IS NULL THEN
    RETURN json_build_object(
      'can_message', FALSE,
      'messages_remaining', 0,
      'reason', 'Application not found'
    );
  END IF;

  -- Get landlord ID
  SELECT p.landlord_id INTO v_landlord_id
  FROM property_units pu
  JOIN properties p ON p.id = pu.property_id
  WHERE pu.id = v_unit_id;

  -- Check if conversation is blocked
  SELECT COALESCE(conversation_blocked, FALSE) INTO v_conversation_blocked
  FROM message_limits
  WHERE (user_id = p_user_id AND other_user_id IN (v_tenant_id, v_landlord_id))
     OR (user_id IN (v_tenant_id, v_landlord_id) AND other_user_id = p_user_id)
  LIMIT 1;

  IF v_conversation_blocked THEN
    RETURN json_build_object(
      'can_message', FALSE,
      'messages_remaining', 0,
      'reason', 'Your application is no longer being considered for this property'
    );
  END IF;

  -- Check if user is Primary applicant
  SELECT primary_applicant_tenant_id = v_tenant_id INTO v_is_primary
  FROM property_units
  WHERE id = v_unit_id;

  -- If Primary, allow unlimited messaging
  IF v_is_primary THEN
    RETURN json_build_object(
      'can_message', TRUE,
      'messages_remaining', -1,
      'reason', 'unlimited',
      'is_primary', TRUE
    );
  END IF;

  -- For pending applicants: landlord has 3-message limit
  IF p_user_id = v_landlord_id THEN
    SELECT COUNT(*) INTO v_landlord_message_count
    FROM messages
    WHERE sender_id = v_landlord_id 
      AND recipient_id = v_tenant_id
      AND archived = FALSE;

    IF v_landlord_message_count >= v_max_landlord_messages THEN
      RETURN json_build_object(
        'can_message', FALSE,
        'messages_remaining', 0,
        'reason', 'You have reached your message limit. Select this tenant as Primary Applicant to continue messaging.',
        'is_primary', FALSE
      );
    END IF;

    RETURN json_build_object(
      'can_message', TRUE,
      'messages_remaining', v_max_landlord_messages - v_landlord_message_count,
      'reason', 'landlord_limited',
      'is_primary', FALSE
    );
  END IF;

  -- Tenants have unlimited messaging (pending or Primary)
  RETURN json_build_object(
    'can_message', TRUE,
    'messages_remaining', -1,
    'reason', 'tenant_unlimited',
    'is_primary', FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger to auto-pause listing at 6 applications
CREATE OR REPLACE FUNCTION auto_pause_listing_at_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_app_count INTEGER;
  v_property_id UUID;
BEGIN
  -- Count current applications for this unit
  SELECT COUNT(*) INTO v_app_count
  FROM marketplace_applications
  WHERE unit_id = NEW.unit_id
    AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

  -- If at limit (6), pause listing
  IF v_app_count >= 6 THEN
    SELECT property_id INTO v_property_id
    FROM property_units WHERE id = NEW.unit_id;

    UPDATE property_units
    SET on_market = FALSE
    WHERE id = NEW.unit_id;

    UPDATE properties
    SET on_market = FALSE
    WHERE id = v_property_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_pause_at_limit ON marketplace_applications;
CREATE TRIGGER trigger_auto_pause_at_limit
AFTER INSERT ON marketplace_applications
FOR EACH ROW
EXECUTE FUNCTION auto_pause_listing_at_limit();