-- Drop and recreate check_messaging_quota function with corrected joins
DROP FUNCTION IF EXISTS public.check_messaging_quota(uuid, uuid);

CREATE FUNCTION public.check_messaging_quota(p_tenant_id uuid, p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_messages_sent integer;
  v_landlord_messages integer;
  v_is_primary boolean;
  v_property_id uuid;
  v_max_messages integer := 3;
  v_can_message boolean;
  v_reason text;
BEGIN
  -- Get the property_id from the application
  SELECT 
    COALESCE(pa.property_id, pu.property_id),
    COALESCE(pa.is_primary_applicant, ua.is_primary_applicant)
  INTO v_property_id, v_is_primary
  FROM (
    SELECT id, property_id, tenant_id, is_primary_applicant, NULL::uuid as unit_id 
    FROM property_applications 
    WHERE id = p_application_id
    UNION ALL
    SELECT ua.id, pu.property_id, ua.tenant_id, ua.is_primary_applicant, ua.unit_id
    FROM unit_applications ua
    JOIN property_units pu ON ua.unit_id = pu.id
    WHERE ua.id = p_application_id
  ) combined
  LEFT JOIN property_applications pa ON pa.id = p_application_id
  LEFT JOIN unit_applications ua ON ua.id = p_application_id
  LEFT JOIN property_units pu ON ua.unit_id = pu.id
  LIMIT 1;

  IF v_property_id IS NULL THEN
    RETURN jsonb_build_object(
      'can_message', false,
      'messages_remaining', 0,
      'reason', 'Application not found',
      'is_primary', false
    );
  END IF;

  -- Count messages sent by tenant for this property (across all applications for same property)
  SELECT COUNT(*)
  INTO v_messages_sent
  FROM messages m
  WHERE m.sender_id = p_tenant_id
    AND (
      m.property_application_id IN (
        SELECT id FROM property_applications WHERE property_id = v_property_id AND tenant_id = p_tenant_id
      )
      OR m.unit_application_id IN (
        SELECT ua.id FROM unit_applications ua
        JOIN property_units pu ON ua.unit_id = pu.id
        WHERE pu.property_id = v_property_id AND ua.tenant_id = p_tenant_id
      )
    );

  -- Count messages from landlord to this tenant for this property
  SELECT COUNT(*)
  INTO v_landlord_messages
  FROM messages m
  WHERE m.sender_id != p_tenant_id
    AND (
      m.property_application_id IN (
        SELECT id FROM property_applications WHERE property_id = v_property_id AND tenant_id = p_tenant_id
      )
      OR m.unit_application_id IN (
        SELECT ua.id FROM unit_applications ua
        JOIN property_units pu ON ua.unit_id = pu.id
        WHERE pu.property_id = v_property_id AND ua.tenant_id = p_tenant_id
      )
    );

  -- Determine if tenant can message
  IF v_landlord_messages > 0 THEN
    -- Landlord has messaged, tenant can always respond
    v_can_message := true;
    v_reason := 'Landlord has initiated contact';
  ELSIF v_messages_sent < v_max_messages THEN
    -- Tenant still has quota
    v_can_message := true;
    v_reason := 'Within quota limit';
  ELSE
    -- Quota exceeded
    v_can_message := false;
    v_reason := 'Message quota exceeded. Wait for landlord response.';
  END IF;

  RETURN jsonb_build_object(
    'can_message', v_can_message,
    'messages_remaining', GREATEST(0, v_max_messages - v_messages_sent),
    'reason', v_reason,
    'is_primary', COALESCE(v_is_primary, false),
    'landlord_messages', v_landlord_messages,
    'tenant_messages', v_messages_sent
  );
END;
$$;