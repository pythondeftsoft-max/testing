-- Fix pipeline stage consistency and market status logic

-- Update admin_mark_lease_signed to use 'lease_signed' and 'paused' status
CREATE OR REPLACE FUNCTION admin_mark_lease_signed(
  p_unit_id UUID,
  p_send_stripe BOOLEAN DEFAULT TRUE
)
RETURNS JSON AS $$
DECLARE
  v_application RECORD;
  v_property RECORD;
  v_tenant RECORD;
  v_result JSON;
BEGIN
  -- Get the primary application for this unit
  SELECT * INTO v_application
  FROM property_applications
  WHERE unit_id = p_unit_id
    AND is_primary_applicant = true
  LIMIT 1;

  IF v_application IS NULL THEN
    RAISE EXCEPTION 'No primary applicant found for this unit';
  END IF;

  -- Get property and tenant info
  SELECT * INTO v_property FROM property_units WHERE id = p_unit_id;
  SELECT * INTO v_tenant FROM profiles WHERE id = v_application.tenant_id;

  -- Update property unit to lease_signed stage and PAUSED (not off_market until paid)
  UPDATE property_units
  SET 
    pipeline_stage = 'lease_signed',
    status = 'paused',
    on_market = false,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Update tenant to lease_signed stage
  UPDATE profiles
  SET 
    pipeline_stage = 'approved_awaiting',
    updated_at = NOW()
  WHERE id = v_application.tenant_id;

  -- Mark lease as fully executed
  UPDATE property_applications
  SET
    landlord_signed_at = NOW(),
    tenant_signed_at = NOW(),
    lease_fully_executed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_application.id;

  -- Log admin action
  INSERT INTO admin_action_logs (
    admin_user_id,
    action,
    resource_type,
    resource_id,
    details,
    reason
  ) VALUES (
    auth.uid(),
    'mark_lease_signed',
    'property_unit',
    p_unit_id,
    jsonb_build_object(
      'tenant_id', v_application.tenant_id,
      'application_id', v_application.id,
      'send_stripe', p_send_stripe
    ),
    'Admin marked lease as signed'
  );

  -- Build result
  v_result := json_build_object(
    'success', true,
    'application_id', v_application.id,
    'tenant_id', v_application.tenant_id,
    'property_id', v_property.property_id,
    'unit_id', p_unit_id,
    'send_stripe', p_send_stripe
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update tenant_sign_lease to use 'lease_signed' and 'paused' status
CREATE OR REPLACE FUNCTION tenant_sign_lease(
  p_application_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_application RECORD;
  v_unit RECORD;
  v_result JSON;
BEGIN
  -- Get application
  SELECT * INTO v_application
  FROM property_applications
  WHERE id = p_application_id
    AND tenant_id = auth.uid();

  IF v_application IS NULL THEN
    RAISE EXCEPTION 'Application not found or unauthorized';
  END IF;

  -- Verify landlord has already signed
  IF v_application.landlord_signed_at IS NULL THEN
    RAISE EXCEPTION 'Landlord must sign the lease first';
  END IF;

  -- Get unit info
  SELECT * INTO v_unit FROM property_units WHERE id = v_application.unit_id;

  -- Mark tenant as signed and lease as fully executed
  UPDATE property_applications
  SET
    tenant_signed_at = NOW(),
    lease_fully_executed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_application_id;

  -- Move property to lease_signed stage and PAUSED (not off_market until paid)
  UPDATE property_units
  SET 
    pipeline_stage = 'lease_signed',
    status = 'paused',
    on_market = false,
    updated_at = NOW()
  WHERE id = v_application.unit_id;

  -- Move tenant to lease_signed stage
  UPDATE profiles
  SET 
    pipeline_stage = 'approved_awaiting',
    updated_at = NOW()
  WHERE id = v_application.tenant_id;

  -- Build result with Stripe payment link metadata
  v_result := json_build_object(
    'success', true,
    'application_id', v_application.id,
    'tenant_id', v_application.tenant_id,
    'property_id', v_unit.property_id,
    'unit_id', v_application.unit_id,
    'lease_fully_executed', true
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the test unit that's currently stuck
UPDATE property_units 
SET 
  pipeline_stage = 'lease_signed',
  status = 'paused',
  on_market = false,
  updated_at = NOW()
WHERE id = 'befcf220-cd88-43fa-b2a8-74465500fcdc';