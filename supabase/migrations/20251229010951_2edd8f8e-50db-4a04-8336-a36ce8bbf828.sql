-- Update check_messaging_quota to find all related application IDs by property_id
-- This fixes the issue where tenant can't message when landlord's message is linked via a different application type

CREATE OR REPLACE FUNCTION public.check_messaging_quota(
  p_application_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE(can_message boolean, messages_remaining integer, reason text, is_primary boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_message_count INTEGER;
  v_can_message BOOLEAN;
  v_messages_remaining INTEGER;
  v_reason TEXT;
  v_is_primary BOOLEAN := false;
  v_property_id UUID;
BEGIN
  -- First, determine the property_id from whichever application type was passed
  -- Check property_applications
  SELECT property_id INTO v_property_id FROM property_applications WHERE id = p_application_id;
  
  -- If not found, check marketplace_applications  
  IF v_property_id IS NULL THEN
    SELECT property_id INTO v_property_id FROM marketplace_applications WHERE id = p_application_id;
  END IF;
  
  -- If not found, check property_pushes
  IF v_property_id IS NULL THEN
    SELECT property_id INTO v_property_id FROM property_pushes WHERE id = p_application_id;
  END IF;
  
  -- If not found, check unit_applications
  IF v_property_id IS NULL THEN
    SELECT pa.property_id INTO v_property_id 
    FROM unit_applications ua
    JOIN property_applications pa ON ua.property_application_id = pa.id
    WHERE ua.id = p_application_id;
  END IF;

  -- Check if the landlord has sent at least one message for this property
  -- by checking ALL application types that reference this property for this tenant
  SELECT COUNT(*) INTO v_landlord_message_count
  FROM messages m
  WHERE m.created_by_tenant = FALSE
    AND (
      -- Direct match on any of the 4 ID columns
      m.property_application_id = p_application_id
      OR m.marketplace_application_id = p_application_id
      OR m.unit_application_id = p_application_id
      OR m.property_push_id = p_application_id
      -- OR match via property_id across all linked applications for this tenant
      OR m.property_application_id IN (
        SELECT id FROM property_applications WHERE property_id = v_property_id AND tenant_id = p_tenant_id
      )
      OR m.marketplace_application_id IN (
        SELECT id FROM marketplace_applications WHERE property_id = v_property_id AND user_id = p_tenant_id
      )
      OR m.property_push_id IN (
        SELECT id FROM property_pushes WHERE property_id = v_property_id AND tenant_id = p_tenant_id
      )
      OR m.unit_application_id IN (
        SELECT ua.id FROM unit_applications ua
        JOIN property_applications pa ON ua.property_application_id = pa.id
        WHERE pa.property_id = v_property_id AND pa.tenant_id = p_tenant_id
      )
    );
  
  -- Tenant can only message if landlord has sent at least one message
  v_can_message := v_landlord_message_count > 0;
  v_messages_remaining := CASE WHEN v_can_message THEN 999999 ELSE 0 END;
  v_reason := CASE 
    WHEN v_can_message THEN NULL 
    ELSE 'Please wait for the landlord to send the first message'
  END;
  
  RETURN QUERY SELECT v_can_message, v_messages_remaining, v_reason, v_is_primary;
END;
$$;