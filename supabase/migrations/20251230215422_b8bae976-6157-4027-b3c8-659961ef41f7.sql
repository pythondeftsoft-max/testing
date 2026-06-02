CREATE OR REPLACE FUNCTION public.landlord_send_lease(
  p_application_id UUID,
  p_lease_method TEXT DEFAULT 'openkey',
  p_lease_document_id TEXT DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL,
  p_landlord_signature TEXT DEFAULT NULL,
  p_lease_start_date DATE DEFAULT NULL,
  p_lease_end_date DATE DEFAULT NULL
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
  v_application_type TEXT;
  v_tenant_name TEXT;
  v_property_address TEXT;
  v_unit_number TEXT;
  v_rent_amount NUMERIC;
  v_fee_amount NUMERIC;
  v_message_sent BOOLEAN := FALSE;
  v_actual_start_date DATE;
  v_actual_end_date DATE;
BEGIN
  -- Get the current user as landlord
  v_landlord_id := auth.uid();
  
  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Set default dates if not provided
  v_actual_start_date := COALESCE(p_lease_start_date, CURRENT_DATE);
  v_actual_end_date := COALESCE(p_lease_end_date, CURRENT_DATE + INTERVAL '1 year');

  -- Try to find the application in marketplace_applications first
  SELECT 
    ma.user_id,
    ma.property_id,
    COALESCE(p_unit_id, ma.unit_id),
    p.owner_id,
    COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''),
    prop.street_address,
    pu.unit_number,
    COALESCE(pu.rent_amount, prop.rent_amount, 0)
  INTO 
    v_tenant_id,
    v_property_id,
    v_unit_id,
    v_landlord_id,
    v_tenant_name,
    v_property_address,
    v_unit_number,
    v_rent_amount
  FROM marketplace_applications ma
  JOIN profiles p ON p.id = ma.user_id
  JOIN properties prop ON prop.id = ma.property_id
  LEFT JOIN property_units pu ON pu.id = COALESCE(p_unit_id, ma.unit_id)
  WHERE ma.id = p_application_id
    AND prop.owner_id = auth.uid();

  IF v_tenant_id IS NOT NULL THEN
    v_application_type := 'marketplace';
    
    -- Update marketplace application
    UPDATE marketplace_applications
    SET 
      status = 'lease_sent',
      lease_method = p_lease_method,
      lease_document_id = CASE WHEN p_lease_document_id IS NOT NULL THEN p_lease_document_id ELSE lease_document_id END,
      unit_id = COALESCE(p_unit_id, unit_id),
      landlord_signature_name = p_landlord_signature,
      landlord_signed_at = CASE WHEN p_landlord_signature IS NOT NULL THEN NOW() ELSE landlord_signed_at END,
      lease_start_date = v_actual_start_date,
      lease_end_date = v_actual_end_date,
      updated_at = NOW()
    WHERE id = p_application_id;
  ELSE
    -- Try property_applications
    SELECT 
      pa.user_id,
      pa.property_id,
      COALESCE(p_unit_id, pa.unit_id),
      p.owner_id,
      COALESCE(prof.first_name, '') || ' ' || COALESCE(prof.last_name, ''),
      p.street_address,
      pu.unit_number,
      COALESCE(pu.rent_amount, p.rent_amount, 0)
    INTO 
      v_tenant_id,
      v_property_id,
      v_unit_id,
      v_landlord_id,
      v_tenant_name,
      v_property_address,
      v_unit_number,
      v_rent_amount
    FROM property_applications pa
    JOIN profiles prof ON prof.id = pa.user_id
    JOIN properties p ON p.id = pa.property_id
    LEFT JOIN property_units pu ON pu.id = COALESCE(p_unit_id, pa.unit_id)
    WHERE pa.id = p_application_id
      AND p.owner_id = auth.uid();

    IF v_tenant_id IS NOT NULL THEN
      v_application_type := 'property';
      
      -- Update property application
      UPDATE property_applications
      SET 
        status = 'lease_sent',
        lease_method = p_lease_method,
        lease_document_id = CASE WHEN p_lease_document_id IS NOT NULL THEN p_lease_document_id ELSE lease_document_id END,
        unit_id = COALESCE(p_unit_id, unit_id),
        landlord_signature_name = p_landlord_signature,
        landlord_signed_at = CASE WHEN p_landlord_signature IS NOT NULL THEN NOW() ELSE landlord_signed_at END,
        lease_start_date = v_actual_start_date,
        lease_end_date = v_actual_end_date,
        updated_at = NOW()
      WHERE id = p_application_id;
    ELSE
      -- Try property_pushes
      SELECT 
        pp.tenant_id,
        pp.property_id,
        COALESCE(p_unit_id, pp.unit_id),
        p.owner_id,
        COALESCE(prof.first_name, '') || ' ' || COALESCE(prof.last_name, ''),
        p.street_address,
        pu.unit_number,
        COALESCE(pu.rent_amount, p.rent_amount, 0)
      INTO 
        v_tenant_id,
        v_property_id,
        v_unit_id,
        v_landlord_id,
        v_tenant_name,
        v_property_address,
        v_unit_number,
        v_rent_amount
      FROM property_pushes pp
      JOIN profiles prof ON prof.id = pp.tenant_id
      JOIN properties p ON p.id = pp.property_id
      LEFT JOIN property_units pu ON pu.id = COALESCE(p_unit_id, pp.unit_id)
      WHERE pp.id = p_application_id
        AND p.owner_id = auth.uid();

      IF v_tenant_id IS NOT NULL THEN
        v_application_type := 'push';
        
        -- Update property push
        UPDATE property_pushes
        SET 
          status = 'lease_sent',
          lease_method = p_lease_method,
          lease_document_id = CASE WHEN p_lease_document_id IS NOT NULL THEN p_lease_document_id ELSE lease_document_id END,
          unit_id = COALESCE(p_unit_id, unit_id),
          landlord_signature_name = p_landlord_signature,
          landlord_signed_at = CASE WHEN p_landlord_signature IS NOT NULL THEN NOW() ELSE landlord_signed_at END,
          lease_start_date = v_actual_start_date,
          lease_end_date = v_actual_end_date,
          updated_at = NOW()
        WHERE id = p_application_id;
      ELSE
        RAISE EXCEPTION 'Application not found or access denied';
      END IF;
    END IF;
  END IF;

  -- Update unit pipeline stage if unit is specified
  IF v_unit_id IS NOT NULL THEN
    UPDATE property_units
    SET 
      pipeline_stage = 'lease_sent',
      updated_at = NOW()
    WHERE id = v_unit_id;
  END IF;

  -- Calculate placement fee (half month's rent)
  v_fee_amount := ROUND(v_rent_amount / 2, 2);

  -- Send notification message to tenant
  BEGIN
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
      '📝 Your lease agreement is ready for signature! Please review and sign to secure your new home.',
      'Lease Agreement',
      'lease_sent',
      jsonb_build_object(
        'lease_method', p_lease_method,
        'lease_document_id', p_lease_document_id,
        'property_address', v_property_address,
        'unit_number', v_unit_number,
        'rent_amount', v_rent_amount,
        'lease_start_date', v_actual_start_date,
        'lease_end_date', v_actual_end_date
      ),
      FALSE,
      FALSE,
      TRUE
    );
    v_message_sent := TRUE;
  EXCEPTION WHEN OTHERS THEN
    v_message_sent := FALSE;
  END;

  RETURN jsonb_build_object(
    'success', TRUE,
    'application_id', p_application_id,
    'application_type', v_application_type,
    'lease_method', p_lease_method,
    'stripe_fee_amount', v_fee_amount,
    'stripe_session_id', NULL,
    'stripe_link', NULL,
    'message_sent', v_message_sent,
    'lease_start_date', v_actual_start_date,
    'lease_end_date', v_actual_end_date
  );
END;
$$;