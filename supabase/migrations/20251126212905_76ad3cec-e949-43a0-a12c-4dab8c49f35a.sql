-- Drop and recreate landlord_send_lease to use unit rent for placement fee calculation
DROP FUNCTION IF EXISTS landlord_send_lease(UUID, TEXT, UUID, UUID, TEXT);

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
BEGIN
  -- Get application details
  SELECT property_id, unit_id, tenant_id, landlord_id
  INTO v_property_id, v_unit_id, v_tenant_id, v_landlord_id
  FROM marketplace_applications
  WHERE id = p_application_id;

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
    (v_config->>'percentage')::NUMERIC / 100 * 
    COALESCE(
      (SELECT monthly_rent FROM property_units WHERE id = v_unit_id),
      (SELECT monthly_rent FROM properties WHERE id = v_property_id)
    ),
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

  -- Send notification message to tenant
  BEGIN
    INSERT INTO tenant_messages (
      tenant_id,
      message_type,
      subject,
      message_text,
      related_entity_type,
      related_entity_id
    ) VALUES (
      v_tenant_id,
      'lease',
      'Lease Agreement Ready for Signature',
      'Your lease agreement is ready for your signature. Please review and sign it.',
      'application',
      p_application_id
    );
    v_message_sent := true;
  EXCEPTION WHEN OTHERS THEN
    v_message_sent := false;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'placement_fee_id', v_placement_fee_id,
    'fee_amount', v_placement_fee_amount,
    'message_sent', v_message_sent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;