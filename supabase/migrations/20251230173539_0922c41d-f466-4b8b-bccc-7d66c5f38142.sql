-- Drop existing function first (return type mismatch)
DROP FUNCTION IF EXISTS public.landlord_send_lease(UUID, TEXT, TEXT, UUID, TEXT);

-- Recreate with property_pushes support
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
SET search_path = public
AS $$
DECLARE
  v_landlord_id UUID;
  v_tenant_id UUID;
  v_property_id UUID;
  v_unit_id UUID;
  v_application_table TEXT;
  v_monthly_rent NUMERIC;
  v_fee_amount NUMERIC;
  v_stripe_session_id TEXT;
  v_stripe_link TEXT;
  v_message_id UUID;
BEGIN
  -- Get the current user
  v_landlord_id := auth.uid();
  
  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- First try marketplace_applications
  SELECT 
    ma.user_id,
    ma.property_id,
    COALESCE(p_unit_id, ma.unit_id),
    'marketplace'
  INTO v_tenant_id, v_property_id, v_unit_id, v_application_table
  FROM marketplace_applications ma
  JOIN properties p ON ma.property_id = p.id
  WHERE ma.id = p_application_id
    AND p.owner_id = v_landlord_id;

  -- If not found, try property_applications
  IF NOT FOUND THEN
    SELECT 
      pa.tenant_id,
      pa.property_id,
      COALESCE(p_unit_id, pa.unit_id),
      'property'
    INTO v_tenant_id, v_property_id, v_unit_id, v_application_table
    FROM property_applications pa
    JOIN properties p ON pa.property_id = p.id
    WHERE pa.id = p_application_id
      AND p.owner_id = v_landlord_id;
  END IF;

  -- If not found, try property_pushes (admin-matched tenants)
  IF NOT FOUND THEN
    SELECT 
      pp.tenant_id,
      pp.property_id,
      COALESCE(p_unit_id, pp.unit_id),
      'push'
    INTO v_tenant_id, v_property_id, v_unit_id, v_application_table
    FROM property_pushes pp
    JOIN properties p ON pp.property_id = p.id
    WHERE pp.id = p_application_id
      AND p.owner_id = v_landlord_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or access denied';
  END IF;

  -- Get rent amount from unit or property
  IF v_unit_id IS NOT NULL THEN
    SELECT rent_amount INTO v_monthly_rent FROM property_units WHERE id = v_unit_id;
  END IF;
  
  IF v_monthly_rent IS NULL THEN
    SELECT rent_amount INTO v_monthly_rent FROM properties WHERE id = v_property_id;
  END IF;

  -- Calculate placement fee (one month's rent)
  v_fee_amount := COALESCE(v_monthly_rent, 0);

  -- Update application status based on source table
  IF v_application_table = 'marketplace' THEN
    UPDATE marketplace_applications
    SET 
      status = 'lease_sent',
      lease_sent_at = NOW(),
      updated_at = NOW()
    WHERE id = p_application_id;
  ELSIF v_application_table = 'property' THEN
    UPDATE property_applications
    SET 
      status = 'lease_sent',
      lease_sent_at = NOW(),
      updated_at = NOW()
    WHERE id = p_application_id;
  ELSIF v_application_table = 'push' THEN
    UPDATE property_pushes
    SET 
      status = 'lease_sent',
      updated_at = NOW()
    WHERE id = p_application_id;
  END IF;

  -- Create or update placement fee record
  INSERT INTO landlord_placement_fees (
    landlord_id,
    tenant_id,
    property_id,
    unit_id,
    application_id,
    application_source,
    fee_amount,
    fee_status,
    lease_method
  ) VALUES (
    v_landlord_id,
    v_tenant_id,
    v_property_id,
    v_unit_id,
    p_application_id,
    v_application_table,
    v_fee_amount,
    'pending',
    p_lease_method
  )
  ON CONFLICT (application_id) 
  DO UPDATE SET
    fee_amount = EXCLUDED.fee_amount,
    lease_method = EXCLUDED.lease_method,
    updated_at = NOW();

  -- Send message to tenant based on source table
  IF v_application_table = 'marketplace' THEN
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
        WHEN p_lease_method = 'uploaded' THEN '📝 Your landlord has uploaded a signed lease agreement!'
        ELSE '📝 Your lease is ready to sign! Please review and sign the document.'
      END,
      'Lease',
      'lease_sent',
      jsonb_build_object(
        'lease_method', p_lease_method,
        'lease_document_id', p_lease_document_id
      ),
      false,
      false,
      true
    ) RETURNING id INTO v_message_id;
  ELSIF v_application_table = 'property' THEN
    INSERT INTO messages (
      sender_id,
      property_application_id,
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
        WHEN p_lease_method = 'uploaded' THEN '📝 Your landlord has uploaded a signed lease agreement!'
        ELSE '📝 Your lease is ready to sign! Please review and sign the document.'
      END,
      'Lease',
      'lease_sent',
      jsonb_build_object(
        'lease_method', p_lease_method,
        'lease_document_id', p_lease_document_id
      ),
      false,
      false,
      true
    ) RETURNING id INTO v_message_id;
  ELSIF v_application_table = 'push' THEN
    INSERT INTO messages (
      sender_id,
      property_push_id,
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
        WHEN p_lease_method = 'uploaded' THEN '📝 Your landlord has uploaded a signed lease agreement!'
        ELSE '📝 Your lease is ready to sign! Please review and sign the document.'
      END,
      'Lease',
      'lease_sent',
      jsonb_build_object(
        'lease_method', p_lease_method,
        'lease_document_id', p_lease_document_id
      ),
      false,
      false,
      true
    ) RETURNING id INTO v_message_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'lease_method', p_lease_method,
    'stripe_fee_amount', v_fee_amount,
    'stripe_session_id', v_stripe_session_id,
    'stripe_link', v_stripe_link,
    'message_sent', v_message_id IS NOT NULL
  );
END;
$$;