-- Fix: Change p.owner_id to prop.owner_id in landlord_send_lease function
-- The 'p' alias is for profiles table, 'prop' is for properties table

DROP FUNCTION IF EXISTS public.landlord_send_lease(uuid, text, text, text, text, uuid, date, date);

CREATE OR REPLACE FUNCTION public.landlord_send_lease(
  p_application_id uuid,
  p_lease_method text,
  p_document_url text DEFAULT NULL,
  p_landlord_signature_name text DEFAULT NULL,
  p_landlord_signature_data text DEFAULT NULL,
  p_unit_id uuid DEFAULT NULL,
  p_lease_start_date date DEFAULT NULL,
  p_lease_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_property_id uuid;
  v_unit_id uuid;
  v_landlord_id uuid;
  v_application_type text;
  v_rent_amount numeric;
  v_currency_code text;
  v_unit_name text;
  v_property_name text;
  v_tenant_name text;
  v_message_id uuid;
  v_actual_start_date date;
  v_actual_end_date date;
BEGIN
  -- Set default dates if not provided
  v_actual_start_date := COALESCE(p_lease_start_date, CURRENT_DATE);
  v_actual_end_date := COALESCE(p_lease_end_date, CURRENT_DATE + INTERVAL '1 year');

  -- Try to find the application in marketplace_applications first
  SELECT 
    ma.user_id,
    ma.property_id,
    COALESCE(p_unit_id, ma.unit_id),
    prop.owner_id,
    'marketplace',
    COALESCE(pu.rent_amount, prop.rent_amount, 0),
    COALESCE(pu.currency_code, prop.currency_code, 'USD'),
    pu.unit_name,
    prop.name,
    COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')
  INTO 
    v_tenant_id,
    v_property_id,
    v_unit_id,
    v_landlord_id,
    v_application_type,
    v_rent_amount,
    v_currency_code,
    v_unit_name,
    v_property_name,
    v_tenant_name
  FROM marketplace_applications ma
  JOIN profiles p ON p.id = ma.user_id
  JOIN properties prop ON prop.id = ma.property_id
  LEFT JOIN property_units pu ON pu.id = COALESCE(p_unit_id, ma.unit_id)
  WHERE ma.id = p_application_id;

  -- If not found, try property_applications
  IF v_tenant_id IS NULL THEN
    SELECT 
      pa.user_id,
      pa.property_id,
      COALESCE(p_unit_id, pa.unit_id),
      prop.owner_id,
      'property',
      COALESCE(pu.rent_amount, prop.rent_amount, 0),
      COALESCE(pu.currency_code, prop.currency_code, 'USD'),
      pu.unit_name,
      prop.name,
      COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')
    INTO 
      v_tenant_id,
      v_property_id,
      v_unit_id,
      v_landlord_id,
      v_application_type,
      v_rent_amount,
      v_currency_code,
      v_unit_name,
      v_property_name,
      v_tenant_name
    FROM property_applications pa
    JOIN profiles p ON p.id = pa.user_id
    JOIN properties prop ON prop.id = pa.property_id
    LEFT JOIN property_units pu ON pu.id = COALESCE(p_unit_id, pa.unit_id)
    WHERE pa.id = p_application_id;
  END IF;

  -- If still not found, try property_pushes
  IF v_tenant_id IS NULL THEN
    SELECT 
      pp.tenant_id,
      pp.property_id,
      COALESCE(p_unit_id, pp.unit_id),
      prop.owner_id,
      'push',
      COALESCE(pu.rent_amount, prop.rent_amount, 0),
      COALESCE(pu.currency_code, prop.currency_code, 'USD'),
      pu.unit_name,
      prop.name,
      COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')
    INTO 
      v_tenant_id,
      v_property_id,
      v_unit_id,
      v_landlord_id,
      v_application_type,
      v_rent_amount,
      v_currency_code,
      v_unit_name,
      v_property_name,
      v_tenant_name
    FROM property_pushes pp
    JOIN profiles p ON p.id = pp.tenant_id
    JOIN properties prop ON prop.id = pp.property_id
    LEFT JOIN property_units pu ON pu.id = COALESCE(p_unit_id, pp.unit_id)
    WHERE pp.id = p_application_id;
  END IF;

  -- If application not found, raise error
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Application not found: %', p_application_id;
  END IF;

  -- Update the appropriate application table based on type
  IF v_application_type = 'marketplace' THEN
    UPDATE marketplace_applications
    SET 
      status = 'lease_sent',
      lease_document_url = COALESCE(p_document_url, lease_document_url),
      landlord_signature_name = COALESCE(p_landlord_signature_name, landlord_signature_name),
      landlord_signed_at = CASE WHEN p_landlord_signature_name IS NOT NULL THEN NOW() ELSE landlord_signed_at END,
      unit_id = COALESCE(p_unit_id, unit_id),
      lease_start_date = v_actual_start_date,
      lease_end_date = v_actual_end_date,
      updated_at = NOW()
    WHERE id = p_application_id;
  ELSIF v_application_type = 'property' THEN
    UPDATE property_applications
    SET 
      status = 'lease_sent',
      lease_document_url = COALESCE(p_document_url, lease_document_url),
      landlord_signature_name = COALESCE(p_landlord_signature_name, landlord_signature_name),
      landlord_signed_at = CASE WHEN p_landlord_signature_name IS NOT NULL THEN NOW() ELSE landlord_signed_at END,
      unit_id = COALESCE(p_unit_id, unit_id),
      lease_start_date = v_actual_start_date,
      lease_end_date = v_actual_end_date,
      updated_at = NOW()
    WHERE id = p_application_id;
  ELSIF v_application_type = 'push' THEN
    UPDATE property_pushes
    SET 
      status = 'lease_sent',
      lease_document_url = COALESCE(p_document_url, lease_document_url),
      landlord_signature_name = COALESCE(p_landlord_signature_name, landlord_signature_name),
      landlord_signed_at = CASE WHEN p_landlord_signature_name IS NOT NULL THEN NOW() ELSE landlord_signed_at END,
      unit_id = COALESCE(p_unit_id, unit_id),
      lease_start_date = v_actual_start_date,
      lease_end_date = v_actual_end_date,
      updated_at = NOW()
    WHERE id = p_application_id;
  END IF;

  -- Send a message to the tenant about the lease
  INSERT INTO messages (
    sender_id,
    receiver_id,
    property_id,
    topic,
    message_text,
    extension
  ) VALUES (
    v_landlord_id,
    v_tenant_id,
    v_property_id,
    'Lease Agreement Sent',
    'Your landlord has sent you a lease agreement for ' || COALESCE(v_property_name, 'the property') || 
    CASE WHEN v_unit_name IS NOT NULL THEN ' - ' || v_unit_name ELSE '' END || 
    '. Please review and sign the lease to complete your application.',
    jsonb_build_object(
      'type', 'lease_sent',
      'application_id', p_application_id,
      'application_type', v_application_type,
      'lease_method', p_lease_method,
      'document_url', p_document_url,
      'lease_start_date', v_actual_start_date,
      'lease_end_date', v_actual_end_date
    )
  )
  RETURNING id INTO v_message_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'application_type', v_application_type,
    'tenant_id', v_tenant_id,
    'property_id', v_property_id,
    'unit_id', v_unit_id,
    'landlord_id', v_landlord_id,
    'rent_amount', v_rent_amount,
    'currency_code', v_currency_code,
    'message_id', v_message_id,
    'message_sent', true,
    'stripe_fee_amount', 0,
    'lease_start_date', v_actual_start_date,
    'lease_end_date', v_actual_end_date
  );
END;
$$;