-- Add tenant signature column to marketplace_applications
ALTER TABLE marketplace_applications 
ADD COLUMN IF NOT EXISTS tenant_signature_name TEXT,
ADD COLUMN IF NOT EXISTS tenant_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lease_fully_executed_at TIMESTAMPTZ;

-- Create function for tenant to sign marketplace lease
CREATE OR REPLACE FUNCTION tenant_sign_marketplace_lease(
  p_application_id UUID,
  p_tenant_signature TEXT
)
RETURNS JSON AS $$
DECLARE
  v_application RECORD;
  v_property RECORD;
  v_landlord_id UUID;
  v_message_id UUID;
BEGIN
  -- Get application with property details
  SELECT ma.*, p.landlord_id, p.street_address, p.city, p.state, pu.unit_number
  INTO v_application
  FROM marketplace_applications ma
  JOIN properties p ON ma.property_id = p.id
  LEFT JOIN property_units pu ON ma.unit_id = pu.id
  WHERE ma.id = p_application_id
  AND ma.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or access denied';
  END IF;

  -- Verify landlord has signed
  IF v_application.landlord_signature_name IS NULL THEN
    RAISE EXCEPTION 'Landlord must sign the lease first';
  END IF;

  -- Verify not already signed by tenant
  IF v_application.tenant_signature_name IS NOT NULL THEN
    RAISE EXCEPTION 'Lease already signed by tenant';
  END IF;

  -- Update application with tenant signature
  UPDATE marketplace_applications
  SET 
    tenant_signature_name = p_tenant_signature,
    tenant_signed_at = NOW(),
    lease_fully_executed_at = NOW(),
    lifecycle_stage = 'lease_signed',
    updated_at = NOW()
  WHERE id = p_application_id;

  -- Update unit pipeline stage
  IF v_application.unit_id IS NOT NULL THEN
    UPDATE property_units
    SET 
      pipeline_stage = 'filled_awaiting_payment',
      updated_at = NOW()
    WHERE id = v_application.unit_id;
  END IF;

  -- Send message to landlord
  INSERT INTO messages (
    sender_id,
    recipient_id,
    property_id,
    subject,
    body,
    extension,
    metadata
  ) VALUES (
    auth.uid(),
    v_application.landlord_id,
    v_application.property_id,
    'Lease Agreement Fully Executed',
    'The tenant has signed the lease agreement. The lease is now fully executed and both parties can download it.',
    'lease_notification',
    jsonb_build_object(
      'application_id', p_application_id,
      'lease_status', 'fully_executed',
      'property_address', v_application.street_address,
      'unit_number', v_application.unit_number
    )
  )
  RETURNING id INTO v_message_id;

  RETURN json_build_object(
    'success', true,
    'application_id', p_application_id,
    'message_id', v_message_id,
    'message', 'Lease signed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;