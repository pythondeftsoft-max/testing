-- Drop both versions of the function to resolve any issues
DROP FUNCTION IF EXISTS public.landlord_send_lease(UUID, TEXT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.landlord_send_lease(UUID, TEXT, UUID, UUID, TEXT);

-- Recreate the function with correct column references
CREATE OR REPLACE FUNCTION public.landlord_send_lease(
  p_application_id UUID,
  p_lease_method TEXT,
  p_lease_document_id TEXT DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL,
  p_landlord_signature TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_id UUID;
  v_tenant_id UUID;
  v_landlord_id UUID;
  v_unit_name TEXT;
  v_property_name TEXT;
  v_property_address TEXT;
  v_tenant_name TEXT;
  v_message_id UUID;
  v_lease_signing_link TEXT;
  v_stripe_fee_amount NUMERIC := 5.00;
  v_stripe_session_id TEXT;
  v_stripe_link TEXT;
BEGIN
  -- Get application details including tenant and landlord IDs
  SELECT 
    ma.property_id,
    ma.user_id,
    p.owner_id
  INTO 
    v_property_id,
    v_tenant_id,
    v_landlord_id
  FROM marketplace_applications ma
  JOIN properties p ON ma.property_id = p.id
  WHERE ma.id = p_application_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Get property and unit details using actual column names
  SELECT 
    p.address,
    COALESCE(p.street_address || ', ' || p.city || ', ' || p.state, p.address),
    COALESCE(pu.unit_identifier, 'Unit')
  INTO 
    v_property_name,
    v_property_address,
    v_unit_name
  FROM properties p
  LEFT JOIN property_units pu ON pu.id = p_unit_id
  WHERE p.id = v_property_id;

  -- Get tenant name
  SELECT 
    COALESCE(first_name || ' ' || last_name, email)
  INTO v_tenant_name
  FROM profiles
  WHERE id = v_tenant_id;

  -- Update application status
  UPDATE marketplace_applications
  SET 
    status = CASE 
      WHEN p_lease_method = 'openkey' THEN 'lease_signing'
      ELSE 'lease_sent'
    END,
    lease_method = p_lease_method,
    lease_document_id = p_lease_document_id,
    lease_sent_at = NOW(),
    updated_at = NOW()
  WHERE id = p_application_id;

  -- Only send message to tenant for 'openkey' method (frontend handles 'uploaded')
  IF p_lease_method = 'openkey' THEN
    -- Generate lease signing link
    v_lease_signing_link := 'https://app.openkey.co/sign/' || p_application_id::TEXT;

    -- Send message to tenant with lease signing link
    INSERT INTO tenant_messages (
      sender_id,
      recipient_id,
      property_id,
      message_text,
      message_type,
      metadata
    ) VALUES (
      v_landlord_id,
      v_tenant_id,
      v_property_id,
      '📝 Your lease for ' || v_property_name || ' (' || v_unit_name || ') is ready for signing! Please review and sign your lease using the link below.',
      'lease_signing',
      jsonb_build_object(
        'lease_method', p_lease_method,
        'lease_document_id', p_lease_document_id,
        'signing_link', v_lease_signing_link,
        'application_id', p_application_id
      )
    ) RETURNING id INTO v_message_id;
  END IF;

  -- Create Stripe Checkout Session for lease processing fee
  BEGIN
    SELECT session_id, checkout_url
    INTO v_stripe_session_id, v_stripe_link
    FROM create_stripe_checkout_session(
      v_landlord_id,
      v_stripe_fee_amount,
      'usd',
      jsonb_build_object(
        'type', 'lease_processing_fee',
        'application_id', p_application_id,
        'property_id', v_property_id,
        'tenant_id', v_tenant_id,
        'lease_method', p_lease_method
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create Stripe session: %', SQLERRM;
    v_stripe_link := NULL;
  END;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'lease_method', p_lease_method,
    'stripe_fee_amount', v_stripe_fee_amount,
    'stripe_session_id', v_stripe_session_id,
    'stripe_link', v_stripe_link,
    'message_sent', p_lease_method = 'openkey'
  );
END;
$$;