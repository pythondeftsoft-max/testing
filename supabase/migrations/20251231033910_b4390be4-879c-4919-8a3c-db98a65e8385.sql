-- Drop ALL existing versions of landlord_send_lease to clean up duplicates
DROP FUNCTION IF EXISTS public.landlord_send_lease(uuid, text, text, uuid, text);
DROP FUNCTION IF EXISTS public.landlord_send_lease(uuid, text, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.landlord_send_lease(uuid, text, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.landlord_send_lease(uuid, text, text, uuid, text, date, date);
DROP FUNCTION IF EXISTS public.landlord_send_lease(uuid, text, text, text, text, uuid, date, date);

-- Create single unified function with parameter names matching frontend
CREATE OR REPLACE FUNCTION public.landlord_send_lease(
  p_application_id uuid,
  p_lease_method text,
  p_lease_document_id text DEFAULT NULL,
  p_unit_id uuid DEFAULT NULL,
  p_landlord_signature text DEFAULT NULL,
  p_lease_start_date date DEFAULT NULL,
  p_lease_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_id uuid;
  v_tenant_id uuid;
  v_tenant_name text;
  v_property_id uuid;
  v_property_address text;
  v_unit_number text;
  v_rent_amount numeric;
  v_source_type text;
  v_fee_amount numeric := 0;
  v_message_sent boolean := false;
BEGIN
  -- Try marketplace_applications first
  SELECT 
    prop.owner_id,
    ma.user_id,
    COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''),
    ma.property_id,
    prop.address,
    pu.unit_number,
    COALESCE(pu.rent_amount, prop.rent_amount)
  INTO 
    v_landlord_id,
    v_tenant_id,
    v_tenant_name,
    v_property_id,
    v_property_address,
    v_unit_number,
    v_rent_amount
  FROM marketplace_applications ma
  JOIN properties prop ON prop.id = ma.property_id
  JOIN profiles p ON p.id = ma.user_id
  LEFT JOIN property_units pu ON pu.id = COALESCE(p_unit_id, ma.unit_id)
  WHERE ma.id = p_application_id;

  IF v_landlord_id IS NOT NULL THEN
    v_source_type := 'marketplace';
    
    -- Update marketplace application
    UPDATE marketplace_applications
    SET 
      status = 'lease_sent',
      lease_sent_at = now(),
      lease_method = p_lease_method,
      lease_document_id = p_lease_document_id,
      landlord_signature_name = p_landlord_signature,
      landlord_signed_at = CASE WHEN p_landlord_signature IS NOT NULL THEN now() ELSE NULL END,
      lease_start_date = p_lease_start_date,
      lease_end_date = p_lease_end_date,
      unit_id = COALESCE(p_unit_id, unit_id),
      updated_at = now()
    WHERE id = p_application_id;
  ELSE
    -- Try property_applications
    SELECT 
      prop.owner_id,
      pa.user_id,
      COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''),
      pa.property_id,
      prop.address,
      pu.unit_number,
      COALESCE(pu.rent_amount, prop.rent_amount)
    INTO 
      v_landlord_id,
      v_tenant_id,
      v_tenant_name,
      v_property_id,
      v_property_address,
      v_unit_number,
      v_rent_amount
    FROM property_applications pa
    JOIN properties prop ON prop.id = pa.property_id
    JOIN profiles p ON p.id = pa.user_id
    LEFT JOIN property_units pu ON pu.id = COALESCE(p_unit_id, pa.unit_id)
    WHERE pa.id = p_application_id;

    IF v_landlord_id IS NOT NULL THEN
      v_source_type := 'property';
      
      -- Update property application
      UPDATE property_applications
      SET 
        status = 'lease_sent',
        lease_sent_at = now(),
        lease_method = p_lease_method,
        lease_document_id = p_lease_document_id,
        landlord_signature_name = p_landlord_signature,
        landlord_signed_at = CASE WHEN p_landlord_signature IS NOT NULL THEN now() ELSE NULL END,
        lease_start_date = p_lease_start_date,
        lease_end_date = p_lease_end_date,
        unit_id = COALESCE(p_unit_id, unit_id),
        updated_at = now()
      WHERE id = p_application_id;
    ELSE
      -- Try property_pushes
      SELECT 
        prop.owner_id,
        pp.tenant_id,
        COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''),
        pp.property_id,
        prop.address,
        pu.unit_number,
        COALESCE(pu.rent_amount, prop.rent_amount)
      INTO 
        v_landlord_id,
        v_tenant_id,
        v_tenant_name,
        v_property_id,
        v_property_address,
        v_unit_number,
        v_rent_amount
      FROM property_pushes pp
      JOIN properties prop ON prop.id = pp.property_id
      JOIN profiles p ON p.id = pp.tenant_id
      LEFT JOIN property_units pu ON pu.id = COALESCE(p_unit_id, pp.unit_id)
      WHERE pp.id = p_application_id;

      IF v_landlord_id IS NOT NULL THEN
        v_source_type := 'push';
        
        -- Update property push
        UPDATE property_pushes
        SET 
          status = 'lease_sent',
          lease_sent_at = now(),
          lease_method = p_lease_method,
          lease_document_id = p_lease_document_id,
          landlord_signature_name = p_landlord_signature,
          landlord_signed_at = CASE WHEN p_landlord_signature IS NOT NULL THEN now() ELSE NULL END,
          lease_start_date = p_lease_start_date,
          lease_end_date = p_lease_end_date,
          unit_id = COALESCE(p_unit_id, unit_id),
          updated_at = now()
        WHERE id = p_application_id;
      ELSE
        RAISE EXCEPTION 'Application not found: %', p_application_id;
      END IF;
    END IF;
  END IF;

  -- Update unit pipeline stage if unit provided
  IF p_unit_id IS NOT NULL THEN
    UPDATE property_units
    SET 
      pipeline_stage = 'lease_sent',
      updated_at = now()
    WHERE id = p_unit_id;
  END IF;

  -- Calculate placement fee (example: 50% of first month rent)
  v_fee_amount := COALESCE(v_rent_amount, 0) * 0.5;

  -- Send message to tenant
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
      '📝 Your lease agreement is ready for review and signature! Please review the terms and sign to complete your application.',
      'Lease Agreement',
      'lease_sent',
      jsonb_build_object(
        'lease_method', p_lease_method,
        'lease_document_id', p_lease_document_id,
        'property_address', v_property_address,
        'unit_number', v_unit_number,
        'lease_start_date', p_lease_start_date,
        'lease_end_date', p_lease_end_date
      ),
      false,
      false,
      true
    );
    v_message_sent := true;
  EXCEPTION WHEN OTHERS THEN
    v_message_sent := false;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'source_type', v_source_type,
    'lease_method', p_lease_method,
    'stripe_fee_amount', v_fee_amount,
    'stripe_session_id', null,
    'stripe_link', null,
    'message_sent', v_message_sent
  );
END;
$$;