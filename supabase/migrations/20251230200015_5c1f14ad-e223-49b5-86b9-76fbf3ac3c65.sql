-- Add lease-related columns to property_pushes table
ALTER TABLE property_pushes
  ADD COLUMN IF NOT EXISTS landlord_signature_name TEXT,
  ADD COLUMN IF NOT EXISTS landlord_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tenant_signature_name TEXT,
  ADD COLUMN IF NOT EXISTS tenant_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lease_fully_executed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lease_method TEXT,
  ADD COLUMN IF NOT EXISTS lease_document_id TEXT,
  ADD COLUMN IF NOT EXISTS lease_start_date DATE,
  ADD COLUMN IF NOT EXISTS lease_end_date DATE;

-- Update landlord_send_lease function to use correct column names and store payload
CREATE OR REPLACE FUNCTION public.landlord_send_lease(
  p_application_id uuid,
  p_lease_method text DEFAULT 'generated',
  p_lease_document_id uuid DEFAULT NULL,
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
  v_conversation_id uuid;
  v_message_id uuid;
  v_application_type text;
  v_tenant_name text;
  v_monthly_rent numeric;
  v_property_address text;
  v_unit_number text;
  v_lease_start_date date;
  v_lease_end_date date;
BEGIN
  -- Get current user
  v_landlord_id := auth.uid();
  
  IF v_landlord_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Try to find the application in property_pushes first
  SELECT 
    pp.tenant_id,
    pp.property_id,
    COALESCE(p_unit_id, pp.unit_id),
    'property_push',
    COALESCE(prof.first_name || ' ' || prof.last_name, 'Tenant'),
    COALESCE(pu.monthly_rent, p.monthly_rent, 0),
    COALESCE(p.street_address || ', ' || p.city || ', ' || p.state || ' ' || p.zipcode, ''),
    pu.unit_number,
    pp.lease_start_date,
    pp.lease_end_date
  INTO v_tenant_id, v_property_id, v_unit_id, v_application_type, v_tenant_name, v_monthly_rent, v_property_address, v_unit_number, v_lease_start_date, v_lease_end_date
  FROM property_pushes pp
  JOIN properties p ON p.id = pp.property_id
  LEFT JOIN property_units pu ON pu.id = COALESCE(p_unit_id, pp.unit_id)
  LEFT JOIN profiles prof ON prof.id = pp.tenant_id
  WHERE pp.id = p_application_id
  AND p.owner_id = v_landlord_id;

  -- If not found, try marketplace_applications
  IF v_tenant_id IS NULL THEN
    SELECT 
      ma.tenant_id,
      pu.property_id,
      COALESCE(p_unit_id, ma.unit_id),
      'marketplace_application',
      COALESCE(prof.first_name || ' ' || prof.last_name, 'Tenant'),
      COALESCE(pu.monthly_rent, p.monthly_rent, 0),
      COALESCE(p.street_address || ', ' || p.city || ', ' || p.state || ' ' || p.zipcode, ''),
      pu.unit_number,
      ma.lease_start_date,
      ma.lease_end_date
    INTO v_tenant_id, v_property_id, v_unit_id, v_application_type, v_tenant_name, v_monthly_rent, v_property_address, v_unit_number, v_lease_start_date, v_lease_end_date
    FROM marketplace_applications ma
    JOIN property_units pu ON pu.id = COALESCE(p_unit_id, ma.unit_id)
    JOIN properties p ON p.id = pu.property_id
    LEFT JOIN profiles prof ON prof.id = ma.tenant_id
    WHERE ma.id = p_application_id
    AND p.owner_id = v_landlord_id;
  END IF;

  -- If not found, try property_applications
  IF v_tenant_id IS NULL THEN
    SELECT 
      pa.tenant_id,
      pu.property_id,
      COALESCE(p_unit_id, pa.unit_id),
      'property_application',
      COALESCE(prof.first_name || ' ' || prof.last_name, 'Tenant'),
      COALESCE(pu.monthly_rent, p.monthly_rent, 0),
      COALESCE(p.street_address || ', ' || p.city || ', ' || p.state || ' ' || p.zipcode, ''),
      pu.unit_number,
      pa.lease_start_date,
      pa.lease_end_date
    INTO v_tenant_id, v_property_id, v_unit_id, v_application_type, v_tenant_name, v_monthly_rent, v_property_address, v_unit_number, v_lease_start_date, v_lease_end_date
    FROM property_applications pa
    JOIN property_units pu ON pu.id = COALESCE(p_unit_id, pa.unit_id)
    JOIN properties p ON p.id = pu.property_id
    LEFT JOIN profiles prof ON prof.id = pa.tenant_id
    WHERE pa.id = p_application_id
    AND p.owner_id = v_landlord_id;
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found or access denied');
  END IF;

  -- Update the application status and signature info based on type
  IF v_application_type = 'property_push' THEN
    UPDATE property_pushes
    SET 
      status = 'lease_sent',
      lease_method = p_lease_method,
      lease_document_id = p_lease_document_id::text,
      landlord_signature_name = p_landlord_signature,
      landlord_signed_at = NOW(),
      unit_id = v_unit_id
    WHERE id = p_application_id;
  ELSIF v_application_type = 'marketplace_application' THEN
    UPDATE marketplace_applications
    SET 
      status = 'lease_sent',
      lease_method = p_lease_method,
      lease_document_id = p_lease_document_id,
      landlord_signature_name = p_landlord_signature,
      landlord_signed_at = NOW(),
      unit_id = v_unit_id
    WHERE id = p_application_id;
  ELSIF v_application_type = 'property_application' THEN
    UPDATE property_applications
    SET 
      status = 'lease_sent',
      lease_method = p_lease_method,
      lease_document_id = p_lease_document_id,
      landlord_signature_name = p_landlord_signature,
      landlord_signed_at = NOW(),
      unit_id = v_unit_id
    WHERE id = p_application_id;
  END IF;

  -- Find or create conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE property_id = v_property_id
  AND (
    (v_application_type = 'property_push' AND property_push_id = p_application_id) OR
    (v_application_type = 'marketplace_application' AND marketplace_application_id = p_application_id) OR
    (v_application_type = 'property_application' AND property_application_id = p_application_id)
  )
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (property_id, property_push_id, marketplace_application_id, property_application_id)
    VALUES (
      v_property_id,
      CASE WHEN v_application_type = 'property_push' THEN p_application_id ELSE NULL END,
      CASE WHEN v_application_type = 'marketplace_application' THEN p_application_id ELSE NULL END,
      CASE WHEN v_application_type = 'property_application' THEN p_application_id ELSE NULL END
    )
    RETURNING id INTO v_conversation_id;
  END IF;

  -- Create lease notification message with payload containing all lease data
  INSERT INTO messages (
    conversation_id,
    sender_id,
    receiver_id,
    message_text,
    topic,
    extension,
    payload,
    property_id,
    property_push_id,
    marketplace_application_id,
    property_application_id
  )
  VALUES (
    v_conversation_id,
    v_landlord_id,
    v_tenant_id,
    'Your landlord has sent you a lease agreement to review and sign.',
    'Lease Agreement',
    'lease_notification',
    jsonb_build_object(
      'lease_method', p_lease_method,
      'lease_document_id', p_lease_document_id,
      'landlord_signature', p_landlord_signature,
      'landlord_signed_at', NOW(),
      'monthly_rent', v_monthly_rent,
      'tenant_name', v_tenant_name,
      'property_address', v_property_address,
      'unit_number', v_unit_number,
      'lease_start_date', v_lease_start_date,
      'lease_end_date', v_lease_end_date
    ),
    v_property_id,
    CASE WHEN v_application_type = 'property_push' THEN p_application_id ELSE NULL END,
    CASE WHEN v_application_type = 'marketplace_application' THEN p_application_id ELSE NULL END,
    CASE WHEN v_application_type = 'property_application' THEN p_application_id ELSE NULL END
  )
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id,
    'conversation_id', v_conversation_id,
    'application_type', v_application_type
  );
END;
$$;