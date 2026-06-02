-- Fix tenant_sign_marketplace_lease RPC to use correct message columns and include marketplace_application_id
CREATE OR REPLACE FUNCTION tenant_sign_marketplace_lease(
  p_application_id UUID,
  p_tenant_signature TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_application RECORD;
  v_message_id UUID;
BEGIN
  -- Get the application details
  SELECT * INTO v_application
  FROM marketplace_applications
  WHERE id = p_application_id
    AND tenant_id = auth.uid()
    AND lifecycle_stage IN ('lease_sent', 'applicant', 'screening', 'approved');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or not accessible';
  END IF;

  -- Check if landlord has already signed
  IF v_application.landlord_signature_name IS NULL THEN
    RAISE EXCEPTION 'Landlord has not signed the lease yet';
  END IF;

  -- Check if tenant has already signed
  IF v_application.tenant_signature_name IS NOT NULL THEN
    RAISE EXCEPTION 'You have already signed this lease';
  END IF;

  -- Update application with tenant signature
  UPDATE marketplace_applications
  SET 
    tenant_signature_name = p_tenant_signature,
    tenant_signed_at = now(),
    lease_fully_executed_at = now(),
    lifecycle_stage = 'lease_signed',
    updated_at = now()
  WHERE id = p_application_id;

  -- Update property unit pipeline stage
  UPDATE property_units
  SET 
    pipeline_stage = 'lease_signed',
    updated_at = now()
  WHERE id = v_application.unit_id;

  -- Create message to landlord with correct columns
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
    '✅ The tenant has signed the lease agreement for ' || v_application.street_address || 
    CASE WHEN v_application.unit_number IS NOT NULL THEN ', Unit ' || v_application.unit_number ELSE '' END || 
    '. The lease is now fully executed!',
    'Lease Agreement Signed',
    'lease_notification',
    jsonb_build_object(
      'lease_status', 'fully_executed',
      'property_address', v_application.street_address,
      'unit_number', v_application.unit_number,
      'landlord_signature', v_application.landlord_signature_name,
      'tenant_signature', p_tenant_signature,
      'tenant_signed_at', now(),
      'lease_fully_executed_at', now()
    ),
    true,
    true,
    false
  )
  RETURNING id INTO v_message_id;

  RETURN json_build_object(
    'success', true,
    'application_id', p_application_id,
    'message_id', v_message_id,
    'message', 'Lease signed successfully'
  );
END;
$$;