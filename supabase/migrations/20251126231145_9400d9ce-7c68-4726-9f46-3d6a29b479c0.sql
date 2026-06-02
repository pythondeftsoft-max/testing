-- Fix pipeline_stage for current test unit
UPDATE property_units 
SET pipeline_stage = 'filled_awaiting_payment'
WHERE id = 'befcf220-cd88-43fa-b2a8-74465500fcdc';

-- Fix tenant_sign_marketplace_lease SQL function with correct column references
DROP FUNCTION IF EXISTS public.tenant_sign_marketplace_lease(uuid, text);

CREATE OR REPLACE FUNCTION public.tenant_sign_marketplace_lease(
  p_application_id uuid,
  p_tenant_signature text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application marketplace_applications%ROWTYPE;
  v_property properties%ROWTYPE;
  v_message_id uuid;
  v_message_text text;
  v_property_unit property_units%ROWTYPE;
BEGIN
  -- Get the application with correct column ma.user_id
  SELECT ma.* INTO v_application
  FROM marketplace_applications ma
  WHERE ma.id = p_application_id
    AND ma.user_id = auth.uid()  -- Changed from ma.tenant_id
    AND ma.status = 'lease_sent';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or not in correct state';
  END IF;

  -- Get property with correct column p.owner_id
  SELECT p.* INTO v_property
  FROM properties p
  WHERE p.id = v_application.property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  -- Update application status to lease_signed
  UPDATE marketplace_applications
  SET 
    status = 'lease_signed',
    tenant_signature = p_tenant_signature,
    tenant_signed_at = now(),
    updated_at = now()
  WHERE id = p_application_id;

  -- Get property unit to update pipeline_stage
  SELECT * INTO v_property_unit
  FROM property_units
  WHERE id = v_application.unit_id;

  -- Update property unit pipeline_stage to filled_awaiting_payment
  IF v_property_unit.id IS NOT NULL THEN
    UPDATE property_units
    SET 
      pipeline_stage = 'filled_awaiting_payment',
      updated_at = now()
    WHERE id = v_property_unit.id;
  END IF;

  -- Create message to landlord with correct column p.owner_id
  v_message_text := format(
    'Great news! The tenant has signed the lease for %s. The lease is now fully executed.',
    v_property.address
  );

  INSERT INTO messages (
    sender_id,
    recipient_id,
    property_id,
    subject,
    message_text,
    message_type,
    read
  ) VALUES (
    auth.uid(),
    v_property.owner_id,  -- Changed from v_property.landlord_id
    v_property.id,
    'Lease Fully Executed',
    v_message_text,
    'lease_signed',
    false
  ) RETURNING id INTO v_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'message_id', v_message_id,
    'message', 'Lease signed successfully'
  );
END;
$$;