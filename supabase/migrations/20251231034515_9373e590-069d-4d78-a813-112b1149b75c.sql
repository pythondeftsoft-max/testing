-- Drop the existing function
DROP FUNCTION IF EXISTS public.landlord_send_lease(uuid, text, text, text, text, uuid, date, date);

-- Recreate with all corrected column references
CREATE OR REPLACE FUNCTION public.landlord_send_lease(
  p_application_id uuid,
  p_lease_method text,
  p_lease_document_id text DEFAULT NULL,
  p_landlord_signature text DEFAULT NULL,
  p_landlord_signature_name text DEFAULT NULL,
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
  v_result jsonb;
  v_tenant_id uuid;
  v_property_id uuid;
  v_landlord_id uuid;
  v_rent_amount numeric;
  v_application_type text;
  v_message_id uuid;
BEGIN
  -- Try marketplace_applications first
  SELECT 
    ma.applicant_id,
    COALESCE(ma.unit_id, p_unit_id),
    prop.id,
    prop.owner_id,
    COALESCE(pu.monthly_rent, prop.monthly_rent)
  INTO v_tenant_id, p_unit_id, v_property_id, v_landlord_id, v_rent_amount
  FROM marketplace_applications ma
  JOIN properties prop ON prop.id = ma.property_id
  LEFT JOIN property_units pu ON pu.id = COALESCE(ma.unit_id, p_unit_id)
  WHERE ma.id = p_application_id
    AND prop.owner_id = auth.uid();

  IF v_tenant_id IS NOT NULL THEN
    v_application_type := 'marketplace';
    
    UPDATE marketplace_applications
    SET 
      status = 'lease_sent',
      lease_method = p_lease_method,
      lease_document_id = p_lease_document_id,
      landlord_signature_name = p_landlord_signature_name,
      landlord_signed_at = CASE WHEN p_landlord_signature IS NOT NULL THEN now() END,
      lease_start_date = p_lease_start_date,
      lease_end_date = p_lease_end_date,
      unit_id = p_unit_id,
      updated_at = now()
    WHERE id = p_application_id;
  END IF;

  -- Try property_applications if not found
  IF v_tenant_id IS NULL THEN
    SELECT 
      pa.tenant_id,
      COALESCE(pa.unit_id, p_unit_id),
      prop.id,
      prop.owner_id,
      COALESCE(pu.monthly_rent, prop.monthly_rent)
    INTO v_tenant_id, p_unit_id, v_property_id, v_landlord_id, v_rent_amount
    FROM property_applications pa
    JOIN properties prop ON prop.id = pa.property_id
    LEFT JOIN property_units pu ON pu.id = COALESCE(pa.unit_id, p_unit_id)
    WHERE pa.id = p_application_id
      AND prop.owner_id = auth.uid();

    IF v_tenant_id IS NOT NULL THEN
      v_application_type := 'property';
      
      UPDATE property_applications
      SET 
        status = 'lease_sent',
        lease_method = p_lease_method,
        lease_document_id = p_lease_document_id,
        landlord_signature_name = p_landlord_signature_name,
        landlord_signed_at = CASE WHEN p_landlord_signature IS NOT NULL THEN now() END,
        lease_start_date = p_lease_start_date,
        lease_end_date = p_lease_end_date,
        unit_id = p_unit_id,
        updated_at = now()
      WHERE id = p_application_id;
    END IF;
  END IF;

  -- Try property_pushes if still not found
  IF v_tenant_id IS NULL THEN
    SELECT 
      pp.tenant_id,
      COALESCE(pp.unit_id, p_unit_id),
      prop.id,
      prop.owner_id,
      COALESCE(pu.monthly_rent, prop.monthly_rent)
    INTO v_tenant_id, p_unit_id, v_property_id, v_landlord_id, v_rent_amount
    FROM property_pushes pp
    JOIN properties prop ON prop.id = pp.property_id
    LEFT JOIN property_units pu ON pu.id = COALESCE(pp.unit_id, p_unit_id)
    WHERE pp.id = p_application_id
      AND prop.owner_id = auth.uid();

    IF v_tenant_id IS NOT NULL THEN
      v_application_type := 'push';
      
      UPDATE property_pushes
      SET 
        status = 'lease_sent',
        lease_method = p_lease_method,
        lease_document_id = p_lease_document_id,
        landlord_signature_name = p_landlord_signature_name,
        landlord_signed_at = CASE WHEN p_landlord_signature IS NOT NULL THEN now() END,
        lease_start_date = p_lease_start_date,
        lease_end_date = p_lease_end_date,
        unit_id = p_unit_id,
        updated_at = now()
      WHERE id = p_application_id;
    END IF;
  END IF;

  -- Return error if application not found
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Application not found or unauthorized'
    );
  END IF;

  -- Send message to tenant
  INSERT INTO messages (
    sender_id,
    recipient_id,
    message_text,
    topic,
    extension
  ) VALUES (
    v_landlord_id,
    v_tenant_id,
    'Your lease agreement is ready for review and signature.',
    'Lease Agreement Ready',
    'lease'
  )
  RETURNING id INTO v_message_id;

  -- Return success with details
  RETURN jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'application_type', v_application_type,
    'tenant_id', v_tenant_id,
    'property_id', v_property_id,
    'unit_id', p_unit_id,
    'rent_amount', v_rent_amount,
    'stripe_fee_amount', ROUND(v_rent_amount * 0.029 + 0.30, 2),
    'message_sent', v_message_id IS NOT NULL
  );
END;
$$;