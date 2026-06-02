-- Step 1: Add tenant_signature_date column
ALTER TABLE marketplace_applications 
ADD COLUMN IF NOT EXISTS tenant_signature_date TIMESTAMPTZ;

-- Step 2: Drop and recreate tenant_sign_marketplace_lease function
DROP FUNCTION IF EXISTS tenant_sign_marketplace_lease(uuid, text);

CREATE OR REPLACE FUNCTION tenant_sign_marketplace_lease(
  p_application_id UUID,
  p_tenant_signature TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_landlord_id UUID;
  v_unit_id UUID;
  v_property_id UUID;
  v_landlord_signed_at TIMESTAMPTZ;
  v_is_fully_executed BOOLEAN;
  v_message_id UUID;
  v_result JSONB;
BEGIN
  -- Get application details
  SELECT 
    ma.user_id,
    p.owner_id,
    ma.property_id,
    ma.unit_id,
    ma.landlord_signed_at
  INTO 
    v_tenant_id,
    v_landlord_id,
    v_property_id,
    v_unit_id,
    v_landlord_signed_at
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

  -- Determine if lease is fully executed (landlord already signed)
  v_is_fully_executed := v_landlord_signed_at IS NOT NULL;

  -- Update application with tenant signature
  UPDATE marketplace_applications
  SET 
    status = 'lease_signed',
    tenant_signed_at = NOW(),
    tenant_signature_name = p_tenant_signature,
    tenant_signature_date = NOW(),
    lease_fully_executed_at = CASE WHEN v_is_fully_executed THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_application_id;

  -- Update unit pipeline stage
  IF v_unit_id IS NOT NULL THEN
    UPDATE property_units
    SET 
      pipeline_stage = 'filled_awaiting_payment',
      current_tenant_id = v_tenant_id,
      updated_at = NOW()
    WHERE id = v_unit_id;
  END IF;

  -- Update tenant profile
  UPDATE profiles
  SET 
    housing_status = 'approved',
    pipeline_stage = 'lease_signed',
    updated_at = NOW()
  WHERE id = v_tenant_id;

  -- Create lease_signed message
  INSERT INTO messages (
    marketplace_application_id,
    sender_id,
    topic,
    message_text,
    extension,
    created_by_tenant,
    read_by_tenant,
    read_by_landlord,
    message_context
  ) VALUES (
    p_application_id,
    v_tenant_id,
    'lease',
    CASE WHEN v_is_fully_executed 
      THEN '✅ Lease fully executed! Both landlord and tenant have signed.'
      ELSE '📝 Tenant has signed the lease. Awaiting landlord signature.'
    END,
    CASE WHEN v_is_fully_executed THEN 'lease_signed' ELSE 'lease_notification' END,
    true,
    true,
    false,
    'application'
  )
  RETURNING id INTO v_message_id;

  v_result := jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'tenant_id', v_tenant_id,
    'message_id', v_message_id,
    'is_fully_executed', v_is_fully_executed,
    'message', CASE WHEN v_is_fully_executed 
      THEN 'Lease fully executed' 
      ELSE 'Lease signed, awaiting landlord' 
    END
  );

  RETURN v_result;
END;
$$;

-- Step 3: Fix test application (5194 Coney Island - test 8 tenant)
-- Fix the application record
UPDATE marketplace_applications
SET 
  tenant_signature_name = 'test 8 tenant',
  tenant_signature_date = tenant_signed_at,
  lease_fully_executed_at = tenant_signed_at
WHERE id = '5209dae9-b9dd-411c-9ef1-667210190044';

-- Fix tenant profile pipeline_stage
UPDATE profiles
SET pipeline_stage = 'lease_signed'
WHERE id = (
  SELECT user_id FROM marketplace_applications 
  WHERE id = '5209dae9-b9dd-411c-9ef1-667210190044'
);

-- Create the missing lease_signed message
INSERT INTO messages (
  marketplace_application_id,
  sender_id,
  topic,
  message_text,
  extension,
  created_by_tenant,
  read_by_tenant,
  read_by_landlord,
  message_context
)
SELECT 
  '5209dae9-b9dd-411c-9ef1-667210190044',
  ma.user_id,
  'lease',
  '✅ Lease fully executed! Both landlord and tenant have signed.',
  'lease_signed',
  true,
  true,
  false,
  'application'
FROM marketplace_applications ma
WHERE ma.id = '5209dae9-b9dd-411c-9ef1-667210190044'
AND NOT EXISTS (
  SELECT 1 FROM messages 
  WHERE marketplace_application_id = '5209dae9-b9dd-411c-9ef1-667210190044' 
  AND extension = 'lease_signed'
);