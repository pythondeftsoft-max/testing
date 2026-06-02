-- Fix landlord_send_lease function to use correct column name
DROP FUNCTION IF EXISTS public.landlord_send_lease(UUID, TEXT, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.landlord_send_lease(
  p_application_id UUID,
  p_lease_method TEXT,
  p_lease_document_id TEXT DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL,
  p_landlord_signature TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_application_record RECORD;
  v_tenant_id UUID;
  v_landlord_id UUID;
  v_property_id UUID;
  v_lease_document_id TEXT;
  v_stripe_fee_amount NUMERIC;
  v_stripe_session_id TEXT;
  v_stripe_link TEXT;
  v_message_sent BOOLEAN := FALSE;
  v_fee_percentage NUMERIC;
  v_monthly_rent NUMERIC;
BEGIN
  -- Get application details
  SELECT 
    ma.id,
    ma.user_id,
    ma.property_id,
    p.owner_id
  INTO v_application_record
  FROM marketplace_applications ma
  JOIN properties p ON ma.property_id = p.id
  WHERE ma.id = p_application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  v_tenant_id := v_application_record.user_id;
  v_landlord_id := v_application_record.owner_id;
  v_property_id := v_application_record.property_id;

  -- Get placement fee percentage from platform config
  SELECT (config_value->>'percentage')::NUMERIC INTO v_fee_percentage
  FROM platform_configs 
  WHERE config_key = 'placement_fee_config';

  -- Get monthly rent from unit if provided
  IF p_unit_id IS NOT NULL THEN
    SELECT monthly_rent INTO v_monthly_rent
    FROM property_units 
    WHERE id = p_unit_id;
  END IF;

  -- Calculate placement fee as percentage of monthly rent (defaults to 5 if no rent)
  v_stripe_fee_amount := COALESCE((v_fee_percentage / 100) * v_monthly_rent, 5.00);

  -- Update application status based on lease method
  IF p_lease_method = 'uploaded' THEN
    -- Landlord uploaded already-signed lease
    UPDATE marketplace_applications
    SET 
      status = 'lease_sent',
      lease_sent_at = NOW(),
      lease_method = p_lease_method,
      lease_document_id = p_lease_document_id,
      updated_at = NOW()
    WHERE id = p_application_id;

    v_lease_document_id := p_lease_document_id;
  ELSE
    -- OpenKey lease - send to tenant for signing
    UPDATE marketplace_applications
    SET 
      status = 'lease_sent',
      lease_sent_at = NOW(),
      lease_method = p_lease_method,
      landlord_signature_name = p_landlord_signature,
      landlord_signed_at = CASE WHEN p_landlord_signature IS NOT NULL THEN NOW() ELSE NULL END,
      updated_at = NOW()
    WHERE id = p_application_id;
  END IF;

  -- Send message to tenant
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
    v_landlord_id,
    p_application_id,
    CASE 
      WHEN p_lease_method = 'uploaded' THEN '📝 Your lease is ready! Please review and confirm.'
      ELSE '📝 Your lease is ready for signature. Please review and sign below.'
    END,
    'Lease Ready',
    'lease_sent',
    jsonb_build_object(
      'lease_method', p_lease_method,
      'lease_document_id', v_lease_document_id,
      'unit_id', p_unit_id,
      'landlord_signature', p_landlord_signature
    ),
    FALSE,
    FALSE,
    TRUE
  );

  v_message_sent := TRUE;

  RETURN json_build_object(
    'success', TRUE,
    'application_id', p_application_id,
    'lease_method', p_lease_method,
    'stripe_fee_amount', v_stripe_fee_amount,
    'stripe_session_id', v_stripe_session_id,
    'stripe_link', v_stripe_link,
    'message_sent', v_message_sent
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error in landlord_send_lease: %', SQLERRM;
END;
$$;