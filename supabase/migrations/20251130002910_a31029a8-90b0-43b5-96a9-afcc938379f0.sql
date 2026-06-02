-- Drop existing function first to allow recreation with same signature
DROP FUNCTION IF EXISTS tenant_sign_marketplace_lease(UUID, TEXT);

-- Recreate tenant_sign_marketplace_lease RPC with housing_status update
CREATE OR REPLACE FUNCTION tenant_sign_marketplace_lease(
  p_application_id UUID,
  p_tenant_signature TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_landlord_id UUID;
  v_unit_id UUID;
  v_property_id UUID;
  v_result JSONB;
BEGIN
  -- Get application details
  SELECT 
    ma.user_id,
    p.owner_id,
    ma.property_id,
    ma.unit_id
  INTO 
    v_tenant_id,
    v_landlord_id,
    v_property_id,
    v_unit_id
  FROM marketplace_applications ma
  JOIN properties p ON p.id = ma.property_id
  WHERE ma.id = p_application_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Verify the caller is the tenant
  IF auth.uid() != v_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: Only the tenant can sign the lease';
  END IF;

  -- Update application status to lease_signed
  UPDATE marketplace_applications
  SET 
    status = 'lease_signed',
    tenant_signed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_application_id;

  -- Update unit pipeline stage to filled_awaiting_payment
  IF v_unit_id IS NOT NULL THEN
    UPDATE property_units
    SET 
      pipeline_stage = 'filled_awaiting_payment',
      current_tenant_id = v_tenant_id,
      updated_at = NOW()
    WHERE id = v_unit_id;
  END IF;

  -- Update tenant housing_status to 'approved'
  UPDATE profiles
  SET 
    housing_status = 'approved',
    updated_at = NOW()
  WHERE id = v_tenant_id;

  v_result := jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'tenant_id', v_tenant_id,
    'status', 'lease_signed'
  );

  RETURN v_result;
END;
$$;

-- Fix test 3 tenant's housing_status
UPDATE profiles
SET 
  housing_status = 'approved',
  updated_at = NOW()
WHERE id = 'f3d3fe29-8371-4f4b-85a5-24a2e872d8a9';