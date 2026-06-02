-- Fix landlord_send_lease function to set application_id to NULL for marketplace applications
-- This prevents foreign key constraint violations since landlord_placement_fees.application_id
-- references property_applications.id, not marketplace_applications.id

CREATE OR REPLACE FUNCTION landlord_send_lease(
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
  v_tenant_id UUID;
  v_landlord_id UUID;
  v_property_id UUID;
  v_unit_id UUID;
  v_application_status TEXT;
  v_placement_fee_amount NUMERIC;
  v_placement_fee_id UUID;
  v_is_marketplace_app BOOLEAN := FALSE;
  v_config JSONB;
BEGIN
  -- Check if this is a marketplace application or property application
  IF EXISTS (SELECT 1 FROM marketplace_applications WHERE id = p_application_id) THEN
    v_is_marketplace_app := TRUE;
    
    SELECT tenant_id, landlord_id, property_id, status, unit_id
    INTO v_tenant_id, v_landlord_id, v_property_id, v_application_status, v_unit_id
    FROM marketplace_applications
    WHERE id = p_application_id;
  ELSE
    SELECT tenant_id, landlord_id, property_id, status, unit_id
    INTO v_tenant_id, v_landlord_id, v_property_id, v_application_status, v_unit_id
    FROM property_applications
    WHERE id = p_application_id;
  END IF;

  -- Use provided unit_id if given, otherwise use the one from application
  IF p_unit_id IS NOT NULL THEN
    v_unit_id := p_unit_id;
  END IF;

  -- Verify application exists and is in correct status
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_application_status NOT IN ('approved', 'accepted') THEN
    RAISE EXCEPTION 'Application must be approved or accepted before sending lease';
  END IF;

  -- Get placement fee configuration
  SELECT config_value INTO v_config
  FROM platform_configs
  WHERE config_key = 'placement_fee_config';

  -- Calculate placement fee (default to 50% of first month's rent if config not found)
  v_placement_fee_amount := COALESCE(
    (v_config->>'percentage')::NUMERIC / 100 * 
    (SELECT monthly_rent FROM properties WHERE id = v_property_id),
    0
  );

  -- Create placement fee record
  INSERT INTO landlord_placement_fees (
    landlord_id,
    tenant_id,
    property_id,
    application_id,
    unit_id,
    fee_amount,
    payment_status,
    due_date,
    created_at
  ) VALUES (
    v_landlord_id,
    v_tenant_id,
    v_property_id,
    CASE WHEN v_is_marketplace_app THEN NULL ELSE p_application_id END,
    v_unit_id,
    v_placement_fee_amount,
    'pending',
    NOW() + INTERVAL '30 days',
    NOW()
  )
  RETURNING id INTO v_placement_fee_id;

  -- Update application status to 'lease_sent'
  IF v_is_marketplace_app THEN
    UPDATE marketplace_applications
    SET 
      status = 'lease_sent',
      lease_document_id = p_lease_document_id,
      lease_sent_at = NOW(),
      updated_at = NOW()
    WHERE id = p_application_id;
  ELSE
    UPDATE property_applications
    SET 
      status = 'lease_sent',
      lease_document_id = p_lease_document_id,
      lease_sent_at = NOW(),
      updated_at = NOW()
    WHERE id = p_application_id;
  END IF;

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'application_id', p_application_id,
    'placement_fee_id', v_placement_fee_id,
    'fee_amount', v_placement_fee_amount,
    'message_sent', true
  );
END;
$$;