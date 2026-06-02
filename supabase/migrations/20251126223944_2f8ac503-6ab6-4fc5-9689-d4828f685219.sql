-- Update tenant_sign_marketplace_lease function to simplify the auto-sent message
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
  v_property RECORD;
  v_unit RECORD;
  v_message_id UUID;
  v_result JSON;
BEGIN
  -- Get application details
  SELECT * INTO v_application
  FROM marketplace_applications
  WHERE id = p_application_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or unauthorized';
  END IF;

  -- Get property and unit details
  SELECT * INTO v_property FROM properties WHERE id = v_application.property_id;
  SELECT * INTO v_unit FROM property_units WHERE id = v_application.unit_id;

  -- Update application status to lease_signed
  UPDATE marketplace_applications
  SET 
    status = 'lease_signed',
    tenant_signature = p_tenant_signature,
    tenant_signed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_application_id;

  -- Update unit status to filled_awaiting_payment
  UPDATE property_units
  SET status = 'filled_awaiting_payment'
  WHERE id = v_application.unit_id;

  -- Insert message to landlord
  INSERT INTO messages (
    sender_id,
    recipient_id,
    property_id,
    unit_id,
    application_id,
    subject,
    message,
    message_type,
    read
  ) VALUES (
    auth.uid(),
    v_property.owner_id,
    v_application.property_id,
    v_application.unit_id,
    p_application_id,
    'Lease Fully Executed',
    'The lease has been signed.',
    'lease_signed',
    false
  )
  RETURNING id INTO v_message_id;

  -- Build result
  v_result := json_build_object(
    'success', true,
    'application_id', p_application_id,
    'message_id', v_message_id,
    'message', 'Lease signed successfully'
  );

  RETURN v_result;
END;
$$;