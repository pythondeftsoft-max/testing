-- Drop and recreate tenant_sign_marketplace_lease to support all application types
DROP FUNCTION IF EXISTS tenant_sign_marketplace_lease(uuid, text);

CREATE OR REPLACE FUNCTION tenant_sign_marketplace_lease(
  p_application_id UUID,
  p_tenant_signature TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_landlord_id UUID;
  v_unit_id UUID;
  v_property_id UUID;
  v_landlord_signed_at TIMESTAMPTZ;
  v_is_fully_executed BOOLEAN;
  v_message_id UUID;
  v_result JSONB;
  v_source_type TEXT;
BEGIN
  -- Try marketplace_applications first
  SELECT 
    ma.user_id, p.owner_id, ma.property_id, ma.unit_id, ma.landlord_signed_at
  INTO v_tenant_id, v_landlord_id, v_property_id, v_unit_id, v_landlord_signed_at
  FROM marketplace_applications ma
  JOIN properties p ON p.id = ma.property_id
  WHERE ma.id = p_application_id;

  IF v_tenant_id IS NOT NULL THEN
    v_source_type := 'marketplace';
  ELSE
    -- Try property_applications
    SELECT 
      pa.tenant_id, p.owner_id, pa.property_id, pa.unit_id, pa.landlord_signed_at
    INTO v_tenant_id, v_landlord_id, v_property_id, v_unit_id, v_landlord_signed_at
    FROM property_applications pa
    JOIN properties p ON p.id = pa.property_id
    WHERE pa.id = p_application_id;

    IF v_tenant_id IS NOT NULL THEN
      v_source_type := 'property';
    ELSE
      -- Try property_pushes (admin-driven matches)
      SELECT 
        pp.tenant_id, p.owner_id, pp.property_id, pp.unit_id, pp.landlord_signed_at
      INTO v_tenant_id, v_landlord_id, v_property_id, v_unit_id, v_landlord_signed_at
      FROM property_pushes pp
      JOIN properties p ON p.id = pp.property_id
      WHERE pp.id = p_application_id;

      IF v_tenant_id IS NOT NULL THEN
        v_source_type := 'push';
      ELSE
        RAISE EXCEPTION 'Application not found in any application table';
      END IF;
    END IF;
  END IF;

  -- Verify the caller is the tenant
  IF auth.uid() != v_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: Only the tenant can sign the lease';
  END IF;

  -- Determine if lease is fully executed (landlord already signed)
  v_is_fully_executed := v_landlord_signed_at IS NOT NULL;

  -- Update the appropriate table based on source type
  IF v_source_type = 'marketplace' THEN
    UPDATE marketplace_applications
    SET 
      status = 'lease_signed',
      tenant_signed_at = NOW(),
      tenant_signature_name = p_tenant_signature,
      tenant_signature_date = NOW(),
      lease_fully_executed_at = CASE WHEN v_is_fully_executed THEN NOW() ELSE NULL END,
      updated_at = NOW()
    WHERE id = p_application_id;
  ELSIF v_source_type = 'property' THEN
    UPDATE property_applications
    SET 
      status = 'lease_signed',
      tenant_signed_at = NOW(),
      tenant_signature_name = p_tenant_signature,
      lease_fully_executed_at = CASE WHEN v_is_fully_executed THEN NOW() ELSE NULL END,
      updated_at = NOW()
    WHERE id = p_application_id;
  ELSE -- push
    UPDATE property_pushes
    SET 
      status = 'lease_signed',
      tenant_signed_at = NOW(),
      tenant_signature_name = p_tenant_signature,
      lease_fully_executed_at = CASE WHEN v_is_fully_executed THEN NOW() ELSE NULL END,
      updated_at = NOW()
    WHERE id = p_application_id;
  END IF;

  -- Update unit pipeline stage if unit exists
  IF v_unit_id IS NOT NULL THEN
    UPDATE property_units
    SET 
      pipeline_stage = 'filled_awaiting_payment',
      current_tenant_id = v_tenant_id,
      updated_at = NOW()
    WHERE id = v_unit_id;
  END IF;

  -- Update tenant profile
  UPDATE profiles
  SET 
    housing_status = 'approved',
    pipeline_stage = 'lease_signed',
    updated_at = NOW()
  WHERE id = v_tenant_id;

  -- Create lease_signed message with correct foreign key based on source
  INSERT INTO messages (
    marketplace_application_id,
    property_application_id,
    property_push_id,
    sender_id,
    topic,
    message_text,
    extension,
    created_by_tenant,
    read_by_tenant,
    read_by_landlord,
    message_context
  ) VALUES (
    CASE WHEN v_source_type = 'marketplace' THEN p_application_id ELSE NULL END,
    CASE WHEN v_source_type = 'property' THEN p_application_id ELSE NULL END,
    CASE WHEN v_source_type = 'push' THEN p_application_id ELSE NULL END,
    v_tenant_id,
    'lease',
    CASE WHEN v_is_fully_executed 
      THEN 'Lease fully executed! Both landlord and tenant have signed.' 
      ELSE 'Tenant has signed the lease. Awaiting landlord signature.' 
    END,
    CASE WHEN v_is_fully_executed THEN 'lease_signed' ELSE 'lease_notification' END,
    true,
    true,
    false,
    'application'
  )
  RETURNING id INTO v_message_id;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'source_type', v_source_type,
    'tenant_id', v_tenant_id,
    'message_id', v_message_id,
    'is_fully_executed', v_is_fully_executed,
    'message', CASE WHEN v_is_fully_executed 
      THEN 'Lease fully executed' 
      ELSE 'Lease signed, awaiting landlord' 
    END
  );
END;
$$;