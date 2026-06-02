-- Fix landlord_send_lease function to use correct messages table schema
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
  v_source_type text;
  v_property_id uuid;
  v_unit_id uuid;
  v_tenant_id uuid;
  v_landlord_id uuid;
  v_monthly_rent numeric;
  v_placement_fee numeric;
  v_fee_percentage numeric := 0.50;
  v_message_id uuid;
BEGIN
  -- First, try to find the application in marketplace_applications
  SELECT 'marketplace', ma.property_id, ma.unit_id, ma.user_id, p.owner_id
  INTO v_source_type, v_property_id, v_unit_id, v_tenant_id, v_landlord_id
  FROM marketplace_applications ma
  JOIN properties p ON p.id = ma.property_id
  WHERE ma.id = p_application_id;

  -- If not found, try property_applications
  IF v_source_type IS NULL THEN
    SELECT 'property', pa.property_id, pa.unit_id, pa.tenant_id, p.owner_id
    INTO v_source_type, v_property_id, v_unit_id, v_tenant_id, v_landlord_id
    FROM property_applications pa
    JOIN properties p ON p.id = pa.property_id
    WHERE pa.id = p_application_id;
  END IF;

  -- If not found, try property_pushes
  IF v_source_type IS NULL THEN
    SELECT 'push', pp.property_id, pp.unit_id, pp.tenant_id, p.owner_id
    INTO v_source_type, v_property_id, v_unit_id, v_tenant_id, v_landlord_id
    FROM property_pushes pp
    JOIN properties p ON p.id = pp.property_id
    WHERE pp.id = p_application_id;
  END IF;

  IF v_source_type IS NULL THEN
    RAISE EXCEPTION 'Application not found: %', p_application_id;
  END IF;

  IF auth.uid() != v_landlord_id THEN
    RAISE EXCEPTION 'Unauthorized: Only the property owner can send a lease';
  END IF;

  IF p_unit_id IS NOT NULL THEN
    v_unit_id := p_unit_id;
  END IF;

  SELECT COALESCE(pu.monthly_rent, pr.monthly_rent, 0)
  INTO v_monthly_rent
  FROM properties pr
  LEFT JOIN property_units pu ON pu.id = v_unit_id
  WHERE pr.id = v_property_id;

  v_placement_fee := v_monthly_rent * v_fee_percentage;

  CASE v_source_type
    WHEN 'marketplace' THEN
      UPDATE marketplace_applications
      SET status = 'lease_sent', updated_at = now()
      WHERE id = p_application_id;
    WHEN 'property' THEN
      UPDATE property_applications
      SET status = 'lease_sent', updated_at = now()
      WHERE id = p_application_id;
    WHEN 'push' THEN
      UPDATE property_pushes
      SET status = 'lease_sent', updated_at = now()
      WHERE id = p_application_id;
  END CASE;

  -- Insert placement fee with correct FK columns based on source type
  INSERT INTO landlord_placement_fees (
    landlord_id,
    property_id,
    unit_id,
    marketplace_application_id,
    application_id,
    tenant_id,
    first_month_rent,
    fee_amount,
    payment_status,
    due_date
  ) VALUES (
    v_landlord_id,
    v_property_id,
    v_unit_id,
    CASE WHEN v_source_type = 'marketplace' THEN p_application_id ELSE NULL END,
    CASE WHEN v_source_type = 'property' THEN p_application_id ELSE NULL END,
    v_tenant_id,
    v_monthly_rent,
    v_placement_fee,
    'pending',
    CURRENT_DATE + INTERVAL '30 days'
  );

  -- Insert message with correct schema (no receiver_id, property_id, message_type columns)
  INSERT INTO messages (
    sender_id,
    marketplace_application_id,
    property_application_id,
    property_push_id,
    topic,
    message_text,
    extension,
    created_by_tenant,
    read_by_tenant,
    read_by_landlord
  ) VALUES (
    v_landlord_id,
    CASE WHEN v_source_type = 'marketplace' THEN p_application_id ELSE NULL END,
    CASE WHEN v_source_type = 'property' THEN p_application_id ELSE NULL END,
    CASE WHEN v_source_type = 'push' THEN p_application_id ELSE NULL END,
    'Lease Agreement',
    'A lease agreement has been sent for your review. Please check your dashboard to review and sign the lease.',
    'lease_notification',
    false,
    false,
    true
  )
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'source_type', v_source_type,
    'property_id', v_property_id,
    'unit_id', v_unit_id,
    'tenant_id', v_tenant_id,
    'monthly_rent', v_monthly_rent,
    'placement_fee', v_placement_fee,
    'message_id', v_message_id
  );
END;
$$;