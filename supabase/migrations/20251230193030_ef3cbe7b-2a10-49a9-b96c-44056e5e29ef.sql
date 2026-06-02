-- Drop and recreate landlord_send_lease WITHOUT the placement fee INSERT
-- This matches the original working flow where placement fees are created at lease confirmation, not when sending

DROP FUNCTION IF EXISTS public.landlord_send_lease(uuid, text, text, uuid, text);

CREATE OR REPLACE FUNCTION public.landlord_send_lease(
  p_application_id uuid,
  p_lease_method text,
  p_lease_document_id text DEFAULT NULL,
  p_unit_id uuid DEFAULT NULL,
  p_landlord_signature text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_id uuid;
  v_tenant_id uuid;
  v_property_id uuid;
  v_unit_id uuid;
  v_monthly_rent numeric;
  v_fee_percentage numeric := 0.50;
  v_placement_fee numeric;
  v_source_type text;
  v_tenant_name text;
  v_property_address text;
BEGIN
  -- Try marketplace_applications first
  SELECT 
    p.owner_id,
    ma.user_id,
    ma.property_id,
    ma.unit_id,
    COALESCE(pu.monthly_rent, p.monthly_rent, 0)
  INTO v_landlord_id, v_tenant_id, v_property_id, v_unit_id, v_monthly_rent
  FROM marketplace_applications ma
  JOIN properties p ON p.id = ma.property_id
  LEFT JOIN property_units pu ON pu.id = ma.unit_id
  WHERE ma.id = p_application_id;

  IF v_landlord_id IS NOT NULL THEN
    v_source_type := 'marketplace';
  ELSE
    -- Try property_applications
    SELECT 
      p.owner_id,
      pa.tenant_id,
      pa.property_id,
      pa.unit_id,
      COALESCE(pu.monthly_rent, p.monthly_rent, 0)
    INTO v_landlord_id, v_tenant_id, v_property_id, v_unit_id, v_monthly_rent
    FROM property_applications pa
    JOIN properties p ON p.id = pa.property_id
    LEFT JOIN property_units pu ON pu.id = pa.unit_id
    WHERE pa.id = p_application_id;

    IF v_landlord_id IS NOT NULL THEN
      v_source_type := 'property';
    ELSE
      -- Try property_pushes
      SELECT 
        p.owner_id,
        pp.tenant_id,
        pp.property_id,
        pp.unit_id,
        COALESCE(pu.monthly_rent, p.monthly_rent, 0)
      INTO v_landlord_id, v_tenant_id, v_property_id, v_unit_id, v_monthly_rent
      FROM property_pushes pp
      JOIN properties p ON p.id = pp.property_id
      LEFT JOIN property_units pu ON pu.id = pp.unit_id
      WHERE pp.id = p_application_id;

      IF v_landlord_id IS NOT NULL THEN
        v_source_type := 'push';
      END IF;
    END IF;
  END IF;

  -- Validate we found the application
  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'Application not found: %', p_application_id;
  END IF;

  -- Authorization check
  IF v_landlord_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to send lease for this application';
  END IF;

  -- Use provided unit_id if given
  IF p_unit_id IS NOT NULL THEN
    v_unit_id := p_unit_id;
    -- Get rent from the specified unit
    SELECT COALESCE(pu.monthly_rent, v_monthly_rent)
    INTO v_monthly_rent
    FROM property_units pu
    WHERE pu.id = p_unit_id;
  END IF;

  -- Calculate placement fee for UI display (not creating record yet)
  v_placement_fee := v_monthly_rent * v_fee_percentage;

  -- Update the appropriate table to 'lease_sent' status
  IF v_source_type = 'marketplace' THEN
    UPDATE marketplace_applications
    SET 
      status = 'lease_sent',
      unit_id = COALESCE(v_unit_id, unit_id),
      updated_at = now()
    WHERE id = p_application_id;
  ELSIF v_source_type = 'property' THEN
    UPDATE property_applications
    SET 
      status = 'lease_sent',
      unit_id = COALESCE(v_unit_id, unit_id),
      updated_at = now()
    WHERE id = p_application_id;
  ELSIF v_source_type = 'push' THEN
    UPDATE property_pushes
    SET 
      status = 'lease_sent',
      unit_id = COALESCE(v_unit_id, unit_id),
      updated_at = now()
    WHERE id = p_application_id;
  END IF;

  -- Get tenant name and property address for message
  SELECT COALESCE(full_name, email, 'Tenant')
  INTO v_tenant_name
  FROM profiles
  WHERE id = v_tenant_id;

  SELECT COALESCE(address, title, 'Property')
  INTO v_property_address
  FROM properties
  WHERE id = v_property_id;

  -- Send notification message based on source type
  IF v_source_type = 'marketplace' THEN
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
      '📝 Your lease agreement is ready for review and signature.',
      'Lease Ready',
      'lease_sent',
      jsonb_build_object(
        'lease_method', p_lease_method,
        'lease_document_id', p_lease_document_id,
        'unit_id', v_unit_id,
        'placement_fee', v_placement_fee
      ),
      false,
      false,
      true
    );
  ELSIF v_source_type = 'property' THEN
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
      '📝 Your lease agreement is ready for review and signature.',
      'Lease Ready',
      'lease_sent',
      jsonb_build_object(
        'lease_method', p_lease_method,
        'lease_document_id', p_lease_document_id,
        'unit_id', v_unit_id,
        'placement_fee', v_placement_fee
      ),
      false,
      false,
      true
    );
  ELSIF v_source_type = 'push' THEN
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
      '📝 Your lease agreement is ready for review and signature.',
      'Lease Ready',
      'lease_sent',
      jsonb_build_object(
        'lease_method', p_lease_method,
        'lease_document_id', p_lease_document_id,
        'unit_id', v_unit_id,
        'placement_fee', v_placement_fee
      ),
      false,
      false,
      true
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'lease_method', p_lease_method,
    'stripe_fee_amount', v_placement_fee,
    'stripe_session_id', null,
    'stripe_link', null,
    'message_sent', true
  );
END;
$$;