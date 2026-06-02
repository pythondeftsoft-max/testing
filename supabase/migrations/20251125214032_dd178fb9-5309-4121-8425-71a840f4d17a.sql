-- Update landlord_send_lease to support both property_applications and marketplace_applications
CREATE OR REPLACE FUNCTION landlord_send_lease(
  p_application_id UUID,
  p_lease_method TEXT,
  p_lease_document_id UUID DEFAULT NULL,
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
  v_property_address TEXT;
  v_message_text TEXT;
  v_result JSON;
  v_unit_id UUID;
  v_is_marketplace_app BOOLEAN := FALSE;
BEGIN
  -- First try to get application from property_applications
  SELECT 
    pa.property_id,
    pa.tenant_id,
    p.owner_id,
    COALESCE(pu.monthly_rent, p.monthly_rent) as monthly_rent,
    p.address,
    pa.unit_id
  INTO 
    v_property_id,
    v_tenant_id,
    v_landlord_id,
    v_monthly_rent,
    v_property_address,
    v_unit_id
  FROM property_applications pa
  JOIN properties p ON pa.property_id = p.id
  LEFT JOIN property_units pu ON pu.id = COALESCE(p_unit_id, pa.unit_id)
  WHERE pa.id = p_application_id;

  -- If not found in property_applications, try marketplace_applications
  IF v_property_id IS NULL THEN
    SELECT 
      ma.property_id,
      ma.user_id,
      p.owner_id,
      COALESCE(pu.monthly_rent, p.monthly_rent) as monthly_rent,
      p.address,
      ma.unit_id
    INTO 
      v_property_id,
      v_tenant_id,
      v_landlord_id,
      v_monthly_rent,
      v_property_address,
      v_unit_id
    FROM marketplace_applications ma
    JOIN properties p ON ma.property_id = p.id
    LEFT JOIN property_units pu ON pu.id = COALESCE(p_unit_id, ma.unit_id)
    WHERE ma.id = p_application_id;
    
    v_is_marketplace_app := TRUE;
  END IF;

  -- If still not found, raise error
  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Application not found with ID: %', p_application_id;
  END IF;

  -- Verify user is the landlord
  IF v_landlord_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the landlord can send lease agreements';
  END IF;

  -- Calculate placement fee (50% of monthly rent by default)
  v_placement_fee_amount := v_monthly_rent * v_fee_multiplier;

  -- Update application status in the correct table
  IF v_is_marketplace_app THEN
    UPDATE marketplace_applications
    SET 
      status = 'lease_sent',
      lease_sent_at = NOW(),
      lease_method = p_lease_method,
      lease_document_id = p_lease_document_id,
      landlord_signature_name = p_landlord_signature,
      landlord_signature_date = CASE WHEN p_landlord_signature IS NOT NULL THEN NOW() ELSE NULL END,
      updated_at = NOW()
    WHERE id = p_application_id;
    
    -- Reject other marketplace applications to this unit/property
    UPDATE marketplace_applications
    SET 
      status = 'rejected',
      rejection_reason = 'Another applicant was selected',
      rejected_by = v_landlord_id,
      rejected_at = NOW(),
      updated_at = NOW()
    WHERE property_id = v_property_id
      AND (unit_id = v_unit_id OR (unit_id IS NULL AND v_unit_id IS NULL))
      AND id != p_application_id
      AND status NOT IN ('withdrawn', 'rejected', 'lease_sent', 'lease_signed', 'housed');
      
    -- Withdraw all other marketplace applications by this tenant
    UPDATE marketplace_applications
    SET 
      status = 'withdrawn',
      withdrawn_reason = 'Accepted lease for another property',
      withdrawn_at = NOW(),
      updated_at = NOW()
    WHERE user_id = v_tenant_id
      AND id != p_application_id
      AND status NOT IN ('withdrawn', 'rejected', 'lease_sent', 'lease_signed', 'housed');
  ELSE
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

    -- Reject all other property applications to this unit/property
    UPDATE property_applications
    SET 
      status = 'rejected',
      rejection_reason = 'Another applicant was selected',
      rejected_by = v_landlord_id,
      rejected_at = NOW(),
      updated_at = NOW()
    WHERE property_id = v_property_id
      AND (unit_id = v_unit_id OR (unit_id IS NULL AND v_unit_id IS NULL))
      AND id != p_application_id
      AND status NOT IN ('withdrawn', 'rejected', 'lease_sent', 'lease_signed', 'housed');

    -- Withdraw all other property applications by this tenant
    UPDATE property_applications
    SET 
      status = 'withdrawn',
      withdrawn_reason = 'Accepted lease for another property',
      withdrawn_at = NOW(),
      updated_at = NOW()
    WHERE tenant_id = v_tenant_id
      AND id != p_application_id
      AND status NOT IN ('withdrawn', 'rejected', 'lease_sent', 'lease_signed', 'housed');
  END IF;

  -- Tie tenant to property unit if unit_id exists
  IF v_unit_id IS NOT NULL THEN
    UPDATE property_units
    SET 
      tenant_id = v_tenant_id,
      status = 'lease_sent',
      updated_at = NOW()
    WHERE id = v_unit_id;
  END IF;

  -- Create placement fee record
  INSERT INTO landlord_placement_fees (
    landlord_id,
    tenant_id,
    property_id,
    application_id,
    fee_amount,
    payment_status,
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

  -- Send notification message to tenant
  IF p_lease_method = 'openkey' THEN
    v_message_text := '📝 Your lease agreement for ' || v_property_address || ' has been sent via OpenKey Digital Signing. Please review and sign electronically.';
  ELSE
    v_message_text := '📝 Your lease agreement for ' || v_property_address || ' has been uploaded. Please review the attached document.';
  END IF;

  INSERT INTO property_application_messages (
    property_application_id,
    sender_id,
    message_text,
    created_by_tenant
  ) VALUES (
    p_application_id,
    v_landlord_id,
    v_message_text,
    false
  );

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