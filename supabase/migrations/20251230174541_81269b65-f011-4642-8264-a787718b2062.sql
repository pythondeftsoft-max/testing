-- Drop and recreate landlord_send_lease function with correct column name
DROP FUNCTION IF EXISTS public.landlord_send_lease(uuid, text, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.landlord_send_lease(
  p_application_id uuid,
  p_lease_method text DEFAULT 'generate',
  p_lease_document_id uuid DEFAULT NULL,
  p_unit_id uuid DEFAULT NULL,
  p_landlord_signature uuid DEFAULT NULL
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
  v_fee_amount numeric;
  v_source_table text;
  v_fee_id uuid;
  v_message_id uuid;
BEGIN
  -- Get the current user (landlord)
  v_landlord_id := auth.uid();
  
  IF v_landlord_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Try to find the application in marketplace_applications first
  SELECT 
    ma.tenant_id,
    ma.property_id,
    ma.unit_id
  INTO v_tenant_id, v_property_id, v_unit_id
  FROM marketplace_applications ma
  JOIN properties p ON p.id = ma.property_id
  WHERE ma.id = p_application_id
    AND p.owner_id = v_landlord_id;
  
  IF v_tenant_id IS NOT NULL THEN
    v_source_table := 'marketplace_applications';
  ELSE
    -- Try property_applications
    SELECT 
      pa.tenant_id,
      pa.property_id,
      pa.unit_id
    INTO v_tenant_id, v_property_id, v_unit_id
    FROM property_applications pa
    JOIN properties p ON p.id = pa.property_id
    WHERE pa.id = p_application_id
      AND p.owner_id = v_landlord_id;
    
    IF v_tenant_id IS NOT NULL THEN
      v_source_table := 'property_applications';
    ELSE
      -- Try property_pushes (admin-pushed matches)
      SELECT 
        pp.tenant_id,
        pp.property_id,
        pp.unit_id
      INTO v_tenant_id, v_property_id, v_unit_id
      FROM property_pushes pp
      JOIN properties p ON p.id = pp.property_id
      WHERE pp.id = p_application_id
        AND p.owner_id = v_landlord_id;
      
      IF v_tenant_id IS NOT NULL THEN
        v_source_table := 'property_pushes';
      ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Application not found or unauthorized');
      END IF;
    END IF;
  END IF;

  -- Use provided unit_id if available, otherwise use the one from the application
  IF p_unit_id IS NOT NULL THEN
    v_unit_id := p_unit_id;
  END IF;

  -- Get monthly rent (prioritize unit rent, fall back to property rent)
  IF v_unit_id IS NOT NULL THEN
    SELECT monthly_rent INTO v_monthly_rent FROM property_units WHERE id = v_unit_id;
  END IF;
  
  IF v_monthly_rent IS NULL THEN
    SELECT monthly_rent INTO v_monthly_rent FROM properties WHERE id = v_property_id;
  END IF;

  -- Calculate fee (100% of monthly rent)
  v_fee_amount := COALESCE(v_monthly_rent, 0);

  -- Update the application status based on source table
  IF v_source_table = 'marketplace_applications' THEN
    UPDATE marketplace_applications 
    SET status = 'lease_sent', updated_at = now()
    WHERE id = p_application_id;
  ELSIF v_source_table = 'property_applications' THEN
    UPDATE property_applications 
    SET status = 'lease_sent', updated_at = now()
    WHERE id = p_application_id;
  ELSIF v_source_table = 'property_pushes' THEN
    UPDATE property_pushes 
    SET status = 'lease_sent', updated_at = now()
    WHERE id = p_application_id;
  END IF;

  -- Insert or update placement fee
  INSERT INTO landlord_placement_fees (
    landlord_id,
    property_id,
    unit_id,
    tenant_id,
    application_id,
    fee_amount,
    fee_status,
    created_at,
    updated_at
  ) VALUES (
    v_landlord_id,
    v_property_id,
    v_unit_id,
    v_tenant_id,
    p_application_id,
    v_fee_amount,
    'pending',
    now(),
    now()
  )
  ON CONFLICT (application_id) DO UPDATE SET
    fee_amount = EXCLUDED.fee_amount,
    updated_at = now()
  RETURNING id INTO v_fee_id;

  -- Send lease notification message to tenant
  INSERT INTO messages (
    sender_id,
    recipient_id,
    property_id,
    property_push_id,
    message_type,
    content,
    payload,
    created_at
  ) VALUES (
    v_landlord_id,
    v_tenant_id,
    v_property_id,
    CASE WHEN v_source_table = 'property_pushes' THEN p_application_id ELSE NULL END,
    'lease_notification',
    'Your landlord has sent you a lease agreement. Please review and sign.',
    jsonb_build_object(
      'lease_method', p_lease_method,
      'lease_document_id', p_lease_document_id,
      'application_id', p_application_id,
      'source_table', v_source_table
    ),
    now()
  )
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'fee_id', v_fee_id,
    'fee_amount', v_fee_amount,
    'message_id', v_message_id,
    'source_table', v_source_table
  );
END;
$$;