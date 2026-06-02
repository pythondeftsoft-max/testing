-- Update landlord_send_lease to send different messages based on lease method
CREATE OR REPLACE FUNCTION landlord_send_lease(
  p_application_id UUID,
  p_lease_method TEXT,
  p_lease_document_id TEXT DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL,
  p_landlord_signature TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_application RECORD;
  v_unit RECORD;
  v_property RECORD;
  v_fee_amount NUMERIC;
  v_placement_fee_id UUID;
  v_notification_sent BOOLEAN := false;
BEGIN
  -- Get application details
  SELECT * INTO v_application
  FROM marketplace_applications
  WHERE id = p_application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Get unit and property details if unit_id provided
  IF p_unit_id IS NOT NULL THEN
    SELECT * INTO v_unit FROM property_units WHERE id = p_unit_id;
    SELECT * INTO v_property FROM properties WHERE id = v_unit.property_id;
  END IF;

  -- Update application status
  UPDATE marketplace_applications
  SET 
    status = 'lease_sent',
    lease_document_id = p_lease_document_id,
    lease_sent_at = NOW(),
    landlord_signature = p_landlord_signature,
    updated_at = NOW()
  WHERE id = p_application_id;

  -- Calculate placement fee (10% of first month's rent)
  v_fee_amount := COALESCE(v_unit.rent_amount, v_property.target_rent, 0) * 0.10;

  -- Create placement fee record
  INSERT INTO landlord_placement_fees (
    landlord_id,
    tenant_id,
    property_id,
    unit_id,
    application_id,
    fee_amount,
    status,
    due_date
  )
  VALUES (
    v_application.landlord_id,
    v_application.tenant_id,
    COALESCE(v_unit.property_id, v_property.id),
    p_unit_id,
    p_application_id,
    v_fee_amount,
    'pending',
    NOW() + INTERVAL '30 days'
  )
  RETURNING id INTO v_placement_fee_id;

  -- Send notification to tenant based on lease method
  BEGIN
    -- Only send "ready for signing" message if using OpenKey method
    -- For uploaded signed leases, the frontend will send a message with the document attached
    IF p_lease_method = 'openkey' THEN
      INSERT INTO user_notifications (
        user_id,
        notification_type,
        title,
        message,
        related_id,
        related_type
      )
      VALUES (
        v_application.tenant_id,
        'lease_ready',
        'Lease Agreement Ready for Signature',
        'Your lease agreement is ready for your signature. Please review and sign it at your earliest convenience.',
        p_application_id,
        'marketplace_application'
      );
      v_notification_sent := true;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the entire operation
    RAISE WARNING 'Failed to send notification: %', SQLERRM;
  END;

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'application_id', p_application_id,
    'placement_fee_id', v_placement_fee_id,
    'fee_amount', v_fee_amount,
    'message_sent', v_notification_sent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;