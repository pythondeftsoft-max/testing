-- Phase 3: Create landlord_send_lease RPC Function

CREATE OR REPLACE FUNCTION landlord_send_lease(
  p_application_id UUID,
  p_lease_method TEXT,
  p_lease_document_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_landlord_id UUID;
  v_property_id UUID;
  v_tenant_id UUID;
  v_rent_amount NUMERIC;
  v_fee_config JSON;
  v_fee_percentage NUMERIC;
  v_fee_amount NUMERIC;
  v_min_fee NUMERIC;
  v_max_fee NUMERIC;
  v_placement_fee_id UUID;
  v_property_address TEXT;
BEGIN
  -- 1. Validate inputs
  IF p_lease_method NOT IN ('uploaded', 'openkey') THEN
    RAISE EXCEPTION 'Invalid lease_method. Must be "uploaded" or "openkey"';
  END IF;

  IF p_lease_method = 'uploaded' AND p_lease_document_id IS NULL THEN
    RAISE EXCEPTION 'lease_document_id is required when lease_method is "uploaded"';
  END IF;

  -- 2. Get application details and verify authorization
  SELECT 
    pa.property_id,
    pa.tenant_id,
    p.owner_id,
    p.address
  INTO 
    v_property_id,
    v_tenant_id,
    v_landlord_id,
    v_property_address
  FROM property_applications pa
  JOIN properties p ON pa.property_id = p.id
  WHERE pa.id = p_application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_landlord_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You are not the landlord of this property';
  END IF;

  -- Check if lease already sent
  IF EXISTS (
    SELECT 1 FROM property_applications 
    WHERE id = p_application_id AND lease_sent_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Lease has already been sent for this application';
  END IF;

  -- 3. Get rent amount (from unit if specified, otherwise from property)
  IF p_unit_id IS NOT NULL THEN
    SELECT monthly_rent INTO v_rent_amount
    FROM property_units
    WHERE id = p_unit_id;
  ELSE
    SELECT monthly_rent INTO v_rent_amount
    FROM properties
    WHERE id = v_property_id;
  END IF;

  IF v_rent_amount IS NULL THEN
    RAISE EXCEPTION 'Rent amount not set for this property/unit';
  END IF;

  -- 4. Update application record
  UPDATE property_applications
  SET 
    lease_sent_at = NOW(),
    lease_sent_by = auth.uid(),
    lease_method = p_lease_method,
    lease_document_id = p_lease_document_id,
    unit_id = p_unit_id,
    status = 'lease_sent',
    updated_at = NOW()
  WHERE id = p_application_id;

  -- 5. Update unit/property pipeline stage
  IF p_unit_id IS NOT NULL THEN
    UPDATE property_units
    SET pipeline_stage = 'lease_sent', updated_at = NOW()
    WHERE id = p_unit_id;
  ELSE
    UPDATE properties
    SET pipeline_stage = 'lease_sent', updated_at = NOW()
    WHERE id = v_property_id;
  END IF;

  -- 6. Update tenant profile
  UPDATE profiles
  SET pipeline_stage = 'lease_sent', updated_at = NOW()
  WHERE id = v_tenant_id;

  -- 7. Withdraw other applications for this tenant
  UPDATE property_applications
  SET 
    status = 'withdrawn',
    updated_at = NOW()
  WHERE tenant_id = v_tenant_id
    AND id != p_application_id
    AND status NOT IN ('withdrawn', 'rejected', 'lease_sent');

  -- 8. Get placement fee config and calculate fee
  SELECT config_value INTO v_fee_config
  FROM platform_configs
  WHERE config_key = 'placement_fee_config';

  v_fee_percentage := (v_fee_config->>'percentage')::NUMERIC;
  v_min_fee := (v_fee_config->>'min_fee')::NUMERIC;
  v_max_fee := (v_fee_config->>'max_fee')::NUMERIC;

  v_fee_amount := v_rent_amount * (v_fee_percentage / 100);

  -- Apply min/max constraints
  IF v_min_fee IS NOT NULL AND v_fee_amount < v_min_fee THEN
    v_fee_amount := v_min_fee;
  END IF;

  IF v_max_fee IS NOT NULL AND v_fee_amount > v_max_fee THEN
    v_fee_amount := v_max_fee;
  END IF;

  -- 9. Create placement fee record
  INSERT INTO landlord_placement_fees (
    landlord_id,
    property_id,
    application_id,
    tenant_id,
    amount_due,
    monthly_rent,
    percentage_charged,
    status,
    due_date,
    created_at,
    updated_at
  ) VALUES (
    v_landlord_id,
    v_property_id,
    p_application_id,
    v_tenant_id,
    v_fee_amount,
    v_rent_amount,
    v_fee_percentage,
    'pending',
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  ) RETURNING id INTO v_placement_fee_id;

  -- 10. Link placement fee to application
  UPDATE property_applications
  SET placement_fee_id = v_placement_fee_id
  WHERE id = p_application_id;

  -- 11. Send message to tenant
  INSERT INTO messages (
    sender_id,
    recipient_id,
    content,
    message_type,
    created_at
  ) VALUES (
    v_landlord_id,
    v_tenant_id,
    CASE 
      WHEN p_lease_method = 'uploaded' THEN
        'Your landlord has sent you a lease agreement for ' || v_property_address || '. Please review and sign the document.'
      WHEN p_lease_method = 'openkey' THEN
        'Your landlord has sent you a lease via OpenKey Digital Signing for ' || v_property_address || '. Please review and sign electronically.'
    END,
    'lease_notification',
    NOW()
  );

  -- 12. Return success response
  RETURN json_build_object(
    'success', true,
    'application_id', p_application_id,
    'placement_fee_id', v_placement_fee_id,
    'fee_amount', v_fee_amount,
    'message_sent', true
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error sending lease: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION landlord_send_lease IS 'Landlord sends lease to tenant, creates placement fee, updates pipelines, and withdraws other applications';