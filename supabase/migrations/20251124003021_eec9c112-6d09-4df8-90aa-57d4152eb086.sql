-- Add missing columns to unit_applications
ALTER TABLE unit_applications 
ADD COLUMN IF NOT EXISTS is_primary_applicant BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add missing column to property_units
ALTER TABLE property_units 
ADD COLUMN IF NOT EXISTS primary_applicant_id UUID REFERENCES tenant_profiles(id);

-- Expand application_status enum to include new values
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'application_status' AND e.enumlabel = 'primary_applicant') THEN
    ALTER TYPE application_status ADD VALUE 'primary_applicant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'application_status' AND e.enumlabel = 'denied') THEN
    ALTER TYPE application_status ADD VALUE 'denied';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'application_status' AND e.enumlabel = 'approved') THEN
    ALTER TYPE application_status ADD VALUE 'approved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'application_status' AND e.enumlabel = 'rejected') THEN
    ALTER TYPE application_status ADD VALUE 'rejected';
  END IF;
END $$;

-- Drop existing functions
DROP FUNCTION IF EXISTS landlord_set_primary_applicant(UUID, UUID);
DROP FUNCTION IF EXISTS landlord_reject_primary_applicant(UUID, TEXT);

-- Recreate landlord_set_primary_applicant with correct schema
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
BEGIN
  -- Get property details and verify ownership
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

  -- Mark all other applications for this unit as not primary
  UPDATE unit_applications
  SET 
    is_primary_applicant = FALSE,
    updated_at = NOW()
  WHERE unit_id = p_unit_id AND is_primary_applicant = TRUE;

  -- Set the selected applicant as primary
  UPDATE unit_applications
  SET 
    status = 'primary_applicant',
    is_primary_applicant = TRUE,
    updated_at = NOW()
  WHERE unit_id = p_unit_id AND tenant_id = p_tenant_id;

  -- Update unit to In Process and set primary applicant
  UPDATE property_units
  SET 
    status = 'in_process',
    primary_applicant_id = p_tenant_id,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Update property to paused
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

-- Recreate landlord_reject_primary_applicant with correct schema
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
  -- Get property details and verify ownership
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

  -- Update the primary applicant's status to denied
  UPDATE unit_applications
  SET 
    status = 'denied',
    is_primary_applicant = FALSE,
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE unit_id = p_unit_id AND tenant_id = v_primary_applicant_id;

  -- Clear primary applicant and set unit back to available
  UPDATE property_units
  SET 
    status = 'available',
    primary_applicant_id = NULL,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Update property back to active
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