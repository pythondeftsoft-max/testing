-- Update landlord_send_lease function to accept and store landlord signature
CREATE OR REPLACE FUNCTION landlord_send_lease(
  p_application_id UUID,
  p_lease_method TEXT,
  p_lease_document_id TEXT DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL,
  p_landlord_signature TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_id UUID;
  v_landlord_id UUID;
  v_tenant_id UUID;
  v_monthly_rent DECIMAL;
  v_placement_fee_amount DECIMAL;
  v_placement_fee_id UUID;
  v_fee_multiplier DECIMAL := 0.5;
  v_result JSON;
BEGIN
  -- Get application details
  SELECT 
    pa.property_id,
    pa.user_id,
    p.landlord_id,
    COALESCE(pu.monthly_rent, p.rent_amount) as monthly_rent
  INTO 
    v_property_id,
    v_tenant_id,
    v_landlord_id,
    v_monthly_rent
  FROM property_applications pa
  JOIN properties p ON pa.property_id = p.id
  LEFT JOIN property_units pu ON pu.id = p_unit_id
  WHERE pa.id = p_application_id;

  -- Verify user is the landlord
  IF v_landlord_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the landlord can send lease agreements';
  END IF;

  -- Calculate placement fee (50% of monthly rent by default)
  v_placement_fee_amount := v_monthly_rent * v_fee_multiplier;

  -- Update application status and lease info
  UPDATE property_applications
  SET 
    status = 'lease_sent',
    lease_sent_at = NOW(),
    lease_method = p_lease_method,
    lease_document_id = p_lease_document_id,
    landlord_signature_name = p_landlord_signature,
    landlord_signature_date = CASE WHEN p_landlord_signature IS NOT NULL THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_application_id;

  -- Create placement fee record
  INSERT INTO landlord_placement_fees (
    landlord_id,
    tenant_id,
    property_id,
    application_id,
    fee_amount,
    status,
    due_date,
    created_at
  ) VALUES (
    v_landlord_id,
    v_tenant_id,
    v_property_id,
    p_application_id,
    v_placement_fee_amount,
    'pending',
    NOW() + INTERVAL '30 days',
    NOW()
  )
  RETURNING id INTO v_placement_fee_id;

  -- Build result JSON
  v_result := json_build_object(
    'success', true,
    'application_id', p_application_id,
    'placement_fee_id', v_placement_fee_id,
    'fee_amount', v_placement_fee_amount,
    'message_sent', true
  );

  RETURN v_result;
END;
$$;