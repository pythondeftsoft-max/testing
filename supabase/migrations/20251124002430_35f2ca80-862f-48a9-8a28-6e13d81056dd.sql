-- Drop existing functions
DROP FUNCTION IF EXISTS landlord_set_primary_applicant(UUID, UUID);
DROP FUNCTION IF EXISTS landlord_reject_primary_applicant(UUID, TEXT);

-- Recreate landlord_set_primary_applicant with correct column reference
CREATE OR REPLACE FUNCTION landlord_set_primary_applicant(
  p_unit_id UUID,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_id UUID;
  v_landlord_id UUID;
  v_unit_record RECORD;
BEGIN
  -- Get property details and verify ownership using owner_id
  SELECT p.id, p.owner_id INTO v_property_id, v_landlord_id
  FROM property_units pu
  JOIN properties p ON pu.property_id = p.id
  WHERE pu.id = p_unit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Verify the caller is the landlord
  IF v_landlord_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this property';
  END IF;

  -- Update unit status to In Process and set primary applicant
  UPDATE property_units
  SET 
    listing_status = 'In Process',
    primary_applicant_id = p_tenant_id,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Update property listing_status to paused
  UPDATE properties
  SET 
    listing_status = 'paused',
    updated_at = NOW()
  WHERE id = v_property_id;

  RETURN jsonb_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'primary_applicant_id', p_tenant_id
  );
END;
$$;

-- Recreate landlord_reject_primary_applicant with correct column reference
CREATE OR REPLACE FUNCTION landlord_reject_primary_applicant(
  p_unit_id UUID,
  p_reason TEXT DEFAULT 'Not a fit'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_id UUID;
  v_landlord_id UUID;
  v_primary_applicant_id UUID;
BEGIN
  -- Get property details and verify ownership using owner_id
  SELECT p.id, p.owner_id, pu.primary_applicant_id 
  INTO v_property_id, v_landlord_id, v_primary_applicant_id
  FROM property_units pu
  JOIN properties p ON pu.property_id = p.id
  WHERE pu.id = p_unit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Verify the caller is the landlord
  IF v_landlord_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this property';
  END IF;

  IF v_primary_applicant_id IS NULL THEN
    RAISE EXCEPTION 'No primary applicant to reject';
  END IF;

  -- Clear primary applicant and set unit back to Active
  UPDATE property_units
  SET 
    listing_status = 'Active',
    primary_applicant_id = NULL,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Update property listing_status back to active
  UPDATE properties
  SET 
    listing_status = 'active',
    updated_at = NOW()
  WHERE id = v_property_id;

  RETURN jsonb_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'rejected_applicant_id', v_primary_applicant_id,
    'reason', p_reason
  );
END;
$$;