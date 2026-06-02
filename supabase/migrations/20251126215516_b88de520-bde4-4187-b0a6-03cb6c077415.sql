-- Update landlord_send_lease to create message in messages table with monthly_rent in payload
CREATE OR REPLACE FUNCTION landlord_send_lease(
  p_application_id UUID,
  p_lease_method TEXT,
  p_lease_document_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL,
  p_landlord_signature TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_property_id UUID;
  v_unit_id UUID;
  v_tenant_id UUID;
  v_landlord_id UUID;
  v_config JSONB;
  v_placement_fee_amount NUMERIC;
  v_placement_fee_id UUID;
  v_message_sent BOOLEAN := false;
  v_message_id UUID;
  v_monthly_rent NUMERIC;
  v_property_address TEXT;
  v_unit_number TEXT;
BEGIN
  -- Get application details
  SELECT 
    ma.property_id, 
    ma.unit_id, 
    ma.tenant_id, 
    ma.landlord_id,
    p.street_address,
    pu.unit_number,
    COALESCE(pu.monthly_rent, p.monthly_rent) as monthly_rent
  INTO 
    v_property_id, 
    v_unit_id, 
    v_tenant_id, 
    v_landlord_id,
    v_property_address,
    v_unit_number,
    v_monthly_rent
  FROM marketplace_applications ma
  JOIN properties p ON p.id = ma.property_id
  LEFT JOIN property_units pu ON pu.id = ma.unit_id
  WHERE ma.id = p_application_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Use provided unit_id if available, otherwise use from application
  v_unit_id := COALESCE(p_unit_id, v_unit_id);

  -- Update application status
  UPDATE marketplace_applications
  SET 
    status = 'lease_sent',
    lease_method = p_lease_method,
    lease_document_id = p_lease_document_id,
    landlord_signature_name = p_landlord_signature,
    landlord_signed_at = CASE 
      WHEN p_lease_method = 'openkey' AND p_landlord_signature IS NOT NULL 
      THEN NOW() 
      ELSE NULL 
    END,
    updated_at = NOW()
  WHERE id = p_application_id;

  -- Get placement fee configuration
  SELECT config INTO v_config
  FROM platform_config
  WHERE key = 'placement_fees';

  -- Calculate placement fee from unit rent (prioritize) or property rent (fallback)
  v_placement_fee_amount := COALESCE(
    (v_config->>'percentage')::NUMERIC / 100 * v_monthly_rent,
    0
  );

  -- Create placement fee record
  INSERT INTO landlord_placement_fees (
    landlord_id,
    property_id,
    unit_id,
    application_id,
    fee_amount,
    fee_percentage,
    status
  ) VALUES (
    v_landlord_id,
    v_property_id,
    v_unit_id,
    p_application_id,
    v_placement_fee_amount,
    (v_config->>'percentage')::NUMERIC,
    'pending'
  )
  RETURNING id INTO v_placement_fee_id;

  -- Create message in messages table with monthly_rent in payload
  BEGIN
    INSERT INTO messages (
      sender_id,
      marketplace_application_id,
      message_text,
      topic,
      extension,
      payload,
      created_by_tenant,
      read_by_tenant,
      read_by_landlord
    ) VALUES (
      auth.uid(),
      p_application_id,
      '📄 Your lease agreement is ready for signature for ' || v_property_address || 
      CASE WHEN v_unit_number IS NOT NULL THEN ', Unit ' || v_unit_number ELSE '' END || 
      '. Please review and sign when ready.',
      'Lease Agreement Ready',
      'lease_notification',
      jsonb_build_object(
        'lease_method', p_lease_method,
        'lease_document_id', p_lease_document_id,
        'monthly_rent', v_monthly_rent,
        'property_address', v_property_address,
        'unit_number', v_unit_number,
        'landlord_signature', p_landlord_signature
      ),
      false,
      false,
      true
    )
    RETURNING id INTO v_message_id;
    v_message_sent := true;
  EXCEPTION WHEN OTHERS THEN
    v_message_sent := false;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'placement_fee_id', v_placement_fee_id,
    'fee_amount', v_placement_fee_amount,
    'message_sent', v_message_sent,
    'message_id', v_message_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;