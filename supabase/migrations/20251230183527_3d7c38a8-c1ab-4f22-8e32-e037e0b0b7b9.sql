-- Drop the existing function with text parameters
DROP FUNCTION IF EXISTS public.landlord_send_lease(uuid, text, text, uuid, text);

-- Recreate the function with correct monthly_rent column references
CREATE OR REPLACE FUNCTION public.landlord_send_lease(
  p_application_id uuid,
  p_lease_method text DEFAULT 'generate',
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
  v_fee_id uuid;
  v_message_id uuid;
  v_conversation_id uuid;
BEGIN
  -- Check marketplace_applications first
  SELECT 'marketplace', ma.property_id, ma.unit_id, ma.applicant_id, p.owner_id
  INTO v_source_type, v_property_id, v_unit_id, v_tenant_id, v_landlord_id
  FROM marketplace_applications ma
  JOIN properties p ON p.id = ma.property_id
  WHERE ma.id = p_application_id;

  -- Check property_applications if not found
  IF v_source_type IS NULL THEN
    SELECT 'property', pa.property_id, pa.unit_id, pa.tenant_id, p.owner_id
    INTO v_source_type, v_property_id, v_unit_id, v_tenant_id, v_landlord_id
    FROM property_applications pa
    JOIN properties p ON p.id = pa.property_id
    WHERE pa.id = p_application_id;
  END IF;

  -- Check property_pushes if not found
  IF v_source_type IS NULL THEN
    SELECT 'push', pp.property_id, pp.unit_id, pp.tenant_id, p.owner_id
    INTO v_source_type, v_property_id, v_unit_id, v_tenant_id, v_landlord_id
    FROM property_pushes pp
    JOIN properties p ON p.id = pp.property_id
    WHERE pp.id = p_application_id;
  END IF;

  -- Validate application exists
  IF v_source_type IS NULL THEN
    RAISE EXCEPTION 'Application not found: %', p_application_id;
  END IF;

  -- Authorization check
  IF v_landlord_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to send lease for this application';
  END IF;

  -- Use provided unit_id if passed, otherwise use the one from the application
  IF p_unit_id IS NOT NULL THEN
    v_unit_id := p_unit_id;
  END IF;

  -- Get monthly rent from unit or property (using correct column name: monthly_rent)
  IF v_unit_id IS NOT NULL THEN
    SELECT monthly_rent INTO v_monthly_rent FROM property_units WHERE id = v_unit_id;
  END IF;
  
  IF v_monthly_rent IS NULL THEN
    SELECT monthly_rent INTO v_monthly_rent FROM properties WHERE id = v_property_id;
  END IF;

  -- Calculate placement fee (50% of monthly rent)
  v_placement_fee := COALESCE(v_monthly_rent, 0) * 0.5;

  -- Update the appropriate table to lease_sent status
  IF v_source_type = 'marketplace' THEN
    UPDATE marketplace_applications 
    SET status = 'lease_sent', updated_at = now()
    WHERE id = p_application_id;
  ELSIF v_source_type = 'property' THEN
    UPDATE property_applications 
    SET status = 'lease_sent', updated_at = now()
    WHERE id = p_application_id;
  ELSIF v_source_type = 'push' THEN
    UPDATE property_pushes 
    SET status = 'lease_sent', updated_at = now()
    WHERE id = p_application_id;
  END IF;

  -- Create placement fee record
  INSERT INTO landlord_placement_fees (
    landlord_id,
    property_id,
    unit_id,
    tenant_id,
    application_id,
    application_type,
    fee_amount,
    monthly_rent,
    fee_percentage,
    status
  ) VALUES (
    v_landlord_id,
    v_property_id,
    v_unit_id,
    v_tenant_id,
    p_application_id,
    v_source_type,
    v_placement_fee,
    v_monthly_rent,
    0.5,
    'pending'
  )
  RETURNING id INTO v_fee_id;

  -- Find or create conversation for the lease notification
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE property_id = v_property_id
    AND ((participant1_id = v_landlord_id AND participant2_id = v_tenant_id)
         OR (participant1_id = v_tenant_id AND participant2_id = v_landlord_id))
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (property_id, participant1_id, participant2_id)
    VALUES (v_property_id, v_landlord_id, v_tenant_id)
    RETURNING id INTO v_conversation_id;
  END IF;

  -- Send automated lease notification message
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    message_type,
    marketplace_application_id,
    property_application_id,
    property_push_id
  ) VALUES (
    v_conversation_id,
    v_landlord_id,
    'A lease agreement has been sent for your review. Please check your documents to sign.',
    'lease_notification',
    CASE WHEN v_source_type = 'marketplace' THEN p_application_id ELSE NULL END,
    CASE WHEN v_source_type = 'property' THEN p_application_id ELSE NULL END,
    CASE WHEN v_source_type = 'push' THEN p_application_id ELSE NULL END
  )
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'source_type', v_source_type,
    'property_id', v_property_id,
    'unit_id', v_unit_id,
    'tenant_id', v_tenant_id,
    'fee_id', v_fee_id,
    'fee_amount', v_placement_fee,
    'monthly_rent', v_monthly_rent,
    'message_id', v_message_id,
    'conversation_id', v_conversation_id
  );
END;
$$;