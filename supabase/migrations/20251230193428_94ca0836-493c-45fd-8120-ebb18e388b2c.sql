DROP FUNCTION IF EXISTS public.landlord_send_lease(uuid, text, text, uuid, uuid);

CREATE OR REPLACE FUNCTION public.landlord_send_lease(
  p_application_id uuid,
  p_lease_method text,
  p_lease_document_id text DEFAULT NULL,
  p_unit_id uuid DEFAULT NULL,
  p_landlord_signature uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source text;
  v_tenant_id uuid;
  v_property_id uuid;
  v_landlord_id uuid;
  v_unit_id uuid;
  v_monthly_rent numeric;
  v_placement_fee numeric;
  v_lease_start date;
  v_lease_end date;
  v_tenant_name text;
  v_property_address text;
  v_unit_name text;
BEGIN
  -- First, try to find the application in marketplace_applications
  SELECT 
    'marketplace' as source,
    ma.tenant_id,
    ma.property_id,
    p.owner_id,
    ma.unit_id,
    COALESCE(pu.monthly_rent, p.price) as monthly_rent,
    ma.lease_start,
    ma.lease_end,
    COALESCE(prof.first_name, '') || ' ' || COALESCE(prof.last_name, '') as full_name,
    p.address,
    pu.unit_number
  INTO 
    v_source,
    v_tenant_id,
    v_property_id,
    v_landlord_id,
    v_unit_id,
    v_monthly_rent,
    v_lease_start,
    v_lease_end,
    v_tenant_name,
    v_property_address,
    v_unit_name
  FROM marketplace_applications ma
  JOIN properties p ON p.id = ma.property_id
  LEFT JOIN property_units pu ON pu.id = ma.unit_id
  LEFT JOIN profiles prof ON prof.id = ma.tenant_id
  WHERE ma.id = p_application_id;

  -- If not found in marketplace_applications, try property_applications
  IF v_source IS NULL THEN
    SELECT 
      'property' as source,
      pa.tenant_id,
      pa.property_id,
      p.owner_id,
      pa.unit_id,
      COALESCE(pu.monthly_rent, p.price) as monthly_rent,
      pa.lease_start,
      pa.lease_end,
      COALESCE(prof.first_name, '') || ' ' || COALESCE(prof.last_name, '') as full_name,
      p.address,
      pu.unit_number
    INTO 
      v_source,
      v_tenant_id,
      v_property_id,
      v_landlord_id,
      v_unit_id,
      v_monthly_rent,
      v_lease_start,
      v_lease_end,
      v_tenant_name,
      v_property_address,
      v_unit_name
    FROM property_applications pa
    JOIN properties p ON p.id = pa.property_id
    LEFT JOIN property_units pu ON pu.id = pa.unit_id
    LEFT JOIN profiles prof ON prof.id = pa.tenant_id
    WHERE pa.id = p_application_id;
  END IF;

  -- If not found in property_applications, try property_pushes
  IF v_source IS NULL THEN
    SELECT 
      'push' as source,
      pp.tenant_id,
      pp.property_id,
      p.owner_id,
      pp.unit_id,
      COALESCE(pu.monthly_rent, p.price) as monthly_rent,
      pp.lease_start,
      pp.lease_end,
      COALESCE(prof.first_name, '') || ' ' || COALESCE(prof.last_name, '') as full_name,
      p.address,
      pu.unit_number
    INTO 
      v_source,
      v_tenant_id,
      v_property_id,
      v_landlord_id,
      v_unit_id,
      v_monthly_rent,
      v_lease_start,
      v_lease_end,
      v_tenant_name,
      v_property_address,
      v_unit_name
    FROM property_pushes pp
    JOIN properties p ON p.id = pp.property_id
    LEFT JOIN property_units pu ON pu.id = pp.unit_id
    LEFT JOIN profiles prof ON prof.id = pp.tenant_id
    WHERE pp.id = p_application_id;
  END IF;

  -- If still not found, raise an error
  IF v_source IS NULL THEN
    RAISE EXCEPTION 'Application not found: %', p_application_id;
  END IF;

  -- Authorization check
  IF v_landlord_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this property';
  END IF;

  -- Use provided unit_id if given, otherwise use the one from the application
  IF p_unit_id IS NOT NULL THEN
    v_unit_id := p_unit_id;
    -- Update monthly rent based on the new unit
    SELECT monthly_rent INTO v_monthly_rent FROM property_units WHERE id = v_unit_id;
  END IF;

  -- Calculate placement fee (one month's rent)
  v_placement_fee := COALESCE(v_monthly_rent, 0);

  -- Update the appropriate table based on source
  IF v_source = 'marketplace' THEN
    UPDATE marketplace_applications
    SET 
      status = 'lease_sent',
      lease_method = p_lease_method,
      lease_document_id = p_lease_document_id,
      unit_id = COALESCE(v_unit_id, unit_id),
      landlord_signature = p_landlord_signature,
      updated_at = now()
    WHERE id = p_application_id;

    -- Send automated message to tenant
    INSERT INTO marketplace_messages (application_id, sender_id, recipient_id, message)
    VALUES (
      p_application_id,
      v_landlord_id,
      v_tenant_id,
      'Your lease agreement has been sent. Please review and sign it to complete your application for ' || 
      v_property_address || COALESCE(' - Unit ' || v_unit_name, '') || '.'
    );

  ELSIF v_source = 'property' THEN
    UPDATE property_applications
    SET 
      status = 'lease_sent',
      lease_method = p_lease_method,
      lease_document_id = p_lease_document_id,
      unit_id = COALESCE(v_unit_id, unit_id),
      landlord_signature = p_landlord_signature,
      updated_at = now()
    WHERE id = p_application_id;

    -- Send automated message to tenant
    INSERT INTO property_messages (application_id, sender_id, recipient_id, message)
    VALUES (
      p_application_id,
      v_landlord_id,
      v_tenant_id,
      'Your lease agreement has been sent. Please review and sign it to complete your application for ' || 
      v_property_address || COALESCE(' - Unit ' || v_unit_name, '') || '.'
    );

  ELSIF v_source = 'push' THEN
    UPDATE property_pushes
    SET 
      status = 'lease_sent',
      lease_method = p_lease_method,
      lease_document_id = p_lease_document_id,
      unit_id = COALESCE(v_unit_id, unit_id),
      landlord_signature = p_landlord_signature,
      updated_at = now()
    WHERE id = p_application_id;

    -- Send automated message to tenant via push_messages
    INSERT INTO push_messages (push_id, sender_id, recipient_id, message)
    VALUES (
      p_application_id,
      v_landlord_id,
      v_tenant_id,
      'Your lease agreement has been sent. Please review and sign it to complete your application for ' || 
      v_property_address || COALESCE(' - Unit ' || v_unit_name, '') || '.'
    );
  END IF;

  -- Return success with all relevant information
  RETURN jsonb_build_object(
    'success', true,
    'source', v_source,
    'application_id', p_application_id,
    'tenant_id', v_tenant_id,
    'property_id', v_property_id,
    'unit_id', v_unit_id,
    'monthly_rent', v_monthly_rent,
    'stripe_fee_amount', v_placement_fee,
    'lease_start', v_lease_start,
    'lease_end', v_lease_end,
    'tenant_name', v_tenant_name
  );
END;
$$;