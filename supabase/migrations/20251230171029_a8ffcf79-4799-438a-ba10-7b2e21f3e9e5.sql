-- Fix landlord_send_lease to support property_pushes (admin-push flow) and use correct owner_id column
CREATE OR REPLACE FUNCTION public.landlord_send_lease(
  p_application_id UUID,
  p_lease_method TEXT,
  p_document_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL,
  p_signature_request_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_id UUID;
  v_tenant_id UUID;
  v_property_id UUID;
  v_unit_id UUID;
  v_application_status TEXT;
  v_application_source TEXT; -- 'marketplace', 'property', or 'push'
  v_result JSONB;
  v_lease_method_normalized TEXT;
  v_message_id UUID;
  v_platform_fee NUMERIC;
  v_payment_session_id UUID;
BEGIN
  -- Get the current user (landlord)
  v_landlord_id := auth.uid();
  
  IF v_landlord_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Normalize lease method
  v_lease_method_normalized := LOWER(TRIM(p_lease_method));

  -- First try to find the application in marketplace_applications
  SELECT 
    ma.user_id,
    ma.property_id,
    ma.unit_id,
    ma.status::text
  INTO v_tenant_id, v_property_id, v_unit_id, v_application_status
  FROM marketplace_applications ma
  JOIN properties p ON ma.property_id = p.id
  WHERE ma.id = p_application_id
    AND p.owner_id = v_landlord_id;

  IF v_tenant_id IS NOT NULL THEN
    v_application_source := 'marketplace';
  ELSE
    -- Try property_applications
    SELECT 
      pa.tenant_id,
      pa.property_id,
      pa.unit_id,
      pa.status
    INTO v_tenant_id, v_property_id, v_unit_id, v_application_status
    FROM property_applications pa
    JOIN properties p ON pa.property_id = p.id
    WHERE pa.id = p_application_id
      AND p.owner_id = v_landlord_id;
    
    IF v_tenant_id IS NOT NULL THEN
      v_application_source := 'property';
    ELSE
      -- Try property_pushes (admin-push flow)
      SELECT 
        pp.tenant_id,
        pp.property_id,
        pp.unit_id,
        pp.status
      INTO v_tenant_id, v_property_id, v_unit_id, v_application_status
      FROM property_pushes pp
      JOIN properties p ON pp.property_id = p.id
      WHERE pp.id = p_application_id
        AND p.owner_id = v_landlord_id;
      
      IF v_tenant_id IS NOT NULL THEN
        v_application_source := 'push';
      END IF;
    END IF;
  END IF;

  -- Check if application was found
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found or access denied');
  END IF;

  -- Override unit_id if provided
  IF p_unit_id IS NOT NULL THEN
    v_unit_id := p_unit_id;
  END IF;

  -- Update application status based on which table it's in
  IF v_application_source = 'marketplace' THEN
    UPDATE marketplace_applications
    SET status = 'lease_sent'::application_status,
        lease_sent_at = NOW(),
        updated_at = NOW()
    WHERE id = p_application_id;
  ELSIF v_application_source = 'property' THEN
    UPDATE property_applications
    SET status = 'lease_sent',
        lease_sent_at = NOW(),
        updated_at = NOW()
    WHERE id = p_application_id;
  ELSIF v_application_source = 'push' THEN
    UPDATE property_pushes
    SET status = 'lease_sent',
        updated_at = NOW()
    WHERE id = p_application_id;
  END IF;

  -- Calculate platform fee (example: 2.5% of first month's rent or a fixed fee)
  v_platform_fee := 25.00; -- Fixed platform fee for now

  -- Create payment session for platform fee
  INSERT INTO payment_sessions (
    tenant_id,
    landlord_id,
    property_id,
    unit_id,
    session_type,
    amount,
    currency,
    status,
    metadata
  ) VALUES (
    v_tenant_id,
    v_landlord_id,
    v_property_id,
    v_unit_id,
    'lease_signing_fee',
    v_platform_fee,
    'USD',
    'pending',
    jsonb_build_object(
      'application_id', p_application_id,
      'application_source', v_application_source,
      'lease_method', v_lease_method_normalized,
      'document_id', p_document_id,
      'signature_request_id', p_signature_request_id
    )
  )
  RETURNING id INTO v_payment_session_id;

  -- Send message to tenant about lease - handle based on application source
  IF v_application_source = 'marketplace' THEN
    INSERT INTO messages (
      sender_id,
      marketplace_application_id,
      message_text,
      message_type,
      created_at
    ) VALUES (
      v_landlord_id,
      p_application_id,
      'Your lease agreement is ready for review. Please check your application for details.',
      'lease_notification',
      NOW()
    )
    RETURNING id INTO v_message_id;
  ELSIF v_application_source = 'property' THEN
    INSERT INTO messages (
      sender_id,
      property_application_id,
      message_text,
      message_type,
      created_at
    ) VALUES (
      v_landlord_id,
      p_application_id,
      'Your lease agreement is ready for review. Please check your application for details.',
      'lease_notification',
      NOW()
    )
    RETURNING id INTO v_message_id;
  ELSIF v_application_source = 'push' THEN
    INSERT INTO messages (
      sender_id,
      property_push_id,
      message_text,
      message_type,
      created_at
    ) VALUES (
      v_landlord_id,
      p_application_id,
      'Your lease agreement is ready for review. Please check your application for details.',
      'lease_notification',
      NOW()
    )
    RETURNING id INTO v_message_id;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'application_source', v_application_source,
    'tenant_id', v_tenant_id,
    'property_id', v_property_id,
    'unit_id', v_unit_id,
    'lease_method', v_lease_method_normalized,
    'document_id', p_document_id,
    'signature_request_id', p_signature_request_id,
    'message_id', v_message_id,
    'platform_fee', v_platform_fee,
    'payment_session_id', v_payment_session_id
  );

  RETURN v_result;
END;
$$;