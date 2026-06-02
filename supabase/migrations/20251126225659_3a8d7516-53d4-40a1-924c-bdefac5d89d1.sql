-- Drop and recreate landlord_send_lease function with correct return type
DROP FUNCTION IF EXISTS landlord_send_lease(UUID, TEXT, UUID, UUID, TEXT);

CREATE FUNCTION landlord_send_lease(
  p_application_id UUID,
  p_lease_method TEXT,
  p_lease_document_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL,
  p_landlord_signature TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unit_id UUID;
  v_property_id UUID;
  v_tenant_id UUID;
  v_landlord_id UUID;
  v_monthly_rent DECIMAL(10,2);
  v_placement_fee_id UUID;
  v_message_sent BOOLEAN := false;
BEGIN
  -- Get application and unit details
  SELECT 
    COALESCE(p_unit_id, ma.unit_id),
    pu.property_id,
    ma.tenant_id,
    p.landlord_id,
    pu.monthly_rent
  INTO 
    v_unit_id,
    v_property_id,
    v_tenant_id,
    v_landlord_id,
    v_monthly_rent
  FROM marketplace_applications ma
  JOIN property_units pu ON COALESCE(p_unit_id, ma.unit_id) = pu.id
  JOIN properties p ON pu.property_id = p.id
  WHERE ma.id = p_application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application or unit not found';
  END IF;

  -- Update application
  UPDATE marketplace_applications
  SET 
    lease_method = p_lease_method,
    lease_document_id = p_lease_document_id,
    landlord_signature = p_landlord_signature,
    landlord_signed_at = CASE WHEN p_landlord_signature IS NOT NULL THEN NOW() ELSE NULL END,
    status = 'lease_sent',
    updated_at = NOW()
  WHERE id = p_application_id;

  -- Create placement fee record with correct fee_amount from monthly_rent
  INSERT INTO landlord_placement_fees (
    property_id,
    unit_id,
    tenant_id,
    application_id,
    fee_amount,
    fee_status,
    due_date
  ) VALUES (
    v_property_id,
    v_unit_id,
    v_tenant_id,
    p_application_id,
    v_monthly_rent,
    'pending',
    NOW() + INTERVAL '30 days'
  ) RETURNING id INTO v_placement_fee_id;

  -- Send message to tenant
  BEGIN
    INSERT INTO messages (
      sender_id,
      recipient_id,
      marketplace_application_id,
      message_text,
      topic,
      extension
    ) VALUES (
      v_landlord_id,
      v_tenant_id,
      p_application_id,
      'Your lease is ready for signing',
      'Lease Ready',
      'marketplace'
    );
    v_message_sent := true;
  EXCEPTION WHEN OTHERS THEN
    v_message_sent := false;
  END;

  RETURN json_build_object(
    'success', true,
    'application_id', p_application_id,
    'placement_fee_id', v_placement_fee_id,
    'fee_amount', v_monthly_rent,
    'message_sent', v_message_sent
  );
END;
$$;

-- Fix tenant_sign_marketplace_lease function to update pipeline_stage correctly
DROP FUNCTION IF EXISTS tenant_sign_marketplace_lease(UUID, TEXT);

CREATE FUNCTION tenant_sign_marketplace_lease(
  p_application_id UUID,
  p_tenant_signature TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unit_id UUID;
  v_property_id UUID;
  v_tenant_id UUID;
  v_landlord_id UUID;
  v_message_id UUID;
  v_unit_number TEXT;
  v_property_address TEXT;
BEGIN
  -- Get application details
  SELECT 
    pu.id,
    pu.property_id,
    ma.tenant_id,
    p.landlord_id,
    pu.unit_number,
    p.address
  INTO 
    v_unit_id,
    v_property_id,
    v_tenant_id,
    v_landlord_id,
    v_unit_number,
    v_property_address
  FROM marketplace_applications ma
  JOIN property_units pu ON ma.unit_id = pu.id
  JOIN properties p ON pu.property_id = p.id
  WHERE ma.id = p_application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Update application with tenant signature
  UPDATE marketplace_applications
  SET 
    tenant_signature = p_tenant_signature,
    tenant_signed_at = NOW(),
    status = 'lease_signed',
    updated_at = NOW()
  WHERE id = p_application_id;

  -- Update unit pipeline_stage to filled_awaiting_payment and set current_tenant_id
  UPDATE property_units
  SET 
    pipeline_stage = 'filled_awaiting_payment',
    current_tenant_id = v_tenant_id,
    updated_at = NOW()
  WHERE id = v_unit_id;

  -- Create a message to landlord about lease signing
  INSERT INTO messages (
    sender_id,
    recipient_id,
    marketplace_application_id,
    message_text,
    topic,
    extension
  ) VALUES (
    v_tenant_id,
    v_landlord_id,
    p_application_id,
    'Tenant has signed the lease for ' || COALESCE(v_unit_number, 'unit') || ' at ' || v_property_address,
    'Lease Signed - Payment Pending',
    'marketplace'
  ) RETURNING id INTO v_message_id;

  RETURN json_build_object(
    'success', true,
    'application_id', p_application_id,
    'message_id', v_message_id,
    'message', 'Lease signed successfully'
  );
END;
$$;