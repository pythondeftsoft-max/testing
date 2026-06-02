-- Drop all versions of landlord_reject_primary_applicant to fix function overload conflict
DROP FUNCTION IF EXISTS landlord_reject_primary_applicant(uuid, text);
DROP FUNCTION IF EXISTS landlord_reject_primary_applicant(uuid, uuid, text);

-- Recreate ONLY the 3-parameter version that supports both unit_id and property_id
CREATE OR REPLACE FUNCTION landlord_reject_primary_applicant(
  p_unit_id uuid DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'Not a fit'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_id uuid;
  v_property_id uuid;
  v_unit_id uuid;
  v_tenant_id uuid;
  v_old_status text;
BEGIN
  v_landlord_id := auth.uid();
  
  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate that at least one of unit_id or property_id is provided
  IF p_unit_id IS NULL AND p_property_id IS NULL THEN
    RAISE EXCEPTION 'Either unit_id or property_id must be provided';
  END IF;

  -- If unit_id is provided, get property info from the unit
  IF p_unit_id IS NOT NULL THEN
    SELECT pu.property_id, pu.primary_applicant_id, p.owner_id, pu.status
    INTO v_property_id, v_tenant_id, v_landlord_id, v_old_status
    FROM property_units pu
    JOIN properties p ON pu.property_id = p.id
    WHERE pu.id = p_unit_id
    AND p.owner_id = v_landlord_id;

    IF v_property_id IS NULL THEN
      RAISE EXCEPTION 'Unit not found or you do not own this property';
    END IF;

    IF v_tenant_id IS NULL THEN
      RAISE EXCEPTION 'No primary applicant set for this unit';
    END IF;

    -- Update unit: clear primary applicant and set status back to active
    UPDATE property_units
    SET 
      primary_applicant_id = NULL,
      status = 'active',
      updated_at = now()
    WHERE id = p_unit_id;

    v_unit_id := p_unit_id;
  
  -- If only property_id is provided
  ELSIF p_property_id IS NOT NULL THEN
    SELECT p.id, p.primary_applicant_id, p.owner_id, p.status
    INTO v_property_id, v_tenant_id, v_landlord_id, v_old_status
    FROM properties p
    WHERE p.id = p_property_id
    AND p.owner_id = v_landlord_id;

    IF v_property_id IS NULL THEN
      RAISE EXCEPTION 'Property not found or you do not own this property';
    END IF;

    IF v_tenant_id IS NULL THEN
      RAISE EXCEPTION 'No primary applicant set for this property';
    END IF;

    -- Update property: clear primary applicant and set status back to active
    UPDATE properties
    SET 
      primary_applicant_id = NULL,
      status = 'active',
      updated_at = now()
    WHERE id = p_property_id;
  END IF;

  -- Deny the application in marketplace_applications or property_applications
  -- Try marketplace_applications first
  UPDATE marketplace_applications
  SET 
    status = 'withdrawn',
    updated_at = now()
  WHERE tenant_id = v_tenant_id
  AND property_id = v_property_id
  AND status != 'withdrawn';

  -- If no rows updated, try property_applications
  IF NOT FOUND THEN
    UPDATE property_applications
    SET 
      status = 'withdrawn',
      status_updated_at = now()
    WHERE tenant_id = v_tenant_id
    AND property_id = v_property_id
    AND status != 'withdrawn';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'property_id', v_property_id,
    'unit_id', v_unit_id,
    'tenant_id', v_tenant_id,
    'reason', p_reason
  );
END;
$$;