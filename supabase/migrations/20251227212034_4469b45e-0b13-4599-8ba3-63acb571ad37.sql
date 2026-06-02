-- Drop existing function and recreate with orphaned flag handling
DROP FUNCTION IF EXISTS public.landlord_reject_primary_applicant(UUID, UUID, TEXT);

-- Recreate with fix to handle orphaned primary applicant flags
CREATE OR REPLACE FUNCTION public.landlord_reject_primary_applicant(
  p_unit_id UUID DEFAULT NULL,
  p_property_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Not a fit'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit_id UUID;
  v_property_id UUID;
  v_user_id UUID;
  v_landlord_id UUID;
BEGIN
  -- Get the current user (landlord)
  v_landlord_id := auth.uid();
  
  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Determine unit_id - either directly provided or look up from property
  IF p_unit_id IS NOT NULL THEN
    v_unit_id := p_unit_id;
  ELSIF p_property_id IS NOT NULL THEN
    -- Get the first unit for this property that has a primary applicant
    SELECT pu.id INTO v_unit_id
    FROM property_units pu
    WHERE pu.property_id = p_property_id
      AND pu.primary_applicant_id IS NOT NULL
    LIMIT 1;
    
    -- If no unit with primary_applicant_id, check for orphaned flags in property_applications
    IF v_unit_id IS NULL THEN
      -- Look for orphaned primary applicant flag in property_applications
      SELECT pa.tenant_id INTO v_user_id
      FROM property_applications pa
      JOIN properties p ON pa.property_id = p.id
      WHERE pa.property_id = p_property_id
        AND pa.is_primary_applicant = true
        AND p.landlord_id = v_landlord_id
      LIMIT 1;
      
      IF v_user_id IS NOT NULL THEN
        -- Found orphaned primary flag - clear it
        UPDATE property_applications
        SET 
          is_primary_applicant = false,
          status = 'rejected',
          updated_at = NOW()
        WHERE property_id = p_property_id
          AND is_primary_applicant = true;
        
        -- Also update marketplace_applications if any
        UPDATE marketplace_applications
        SET 
          is_primary_applicant = false,
          status = 'rejected',
          rejection_reason = p_reason,
          updated_at = NOW()
        WHERE property_id = p_property_id
          AND is_primary_applicant = true;
        
        RETURN jsonb_build_object(
          'success', true,
          'unit_id', null,
          'tenant_id', v_user_id,
          'property_id', p_property_id,
          'note', 'Cleared orphaned primary applicant flag'
        );
      END IF;
      
      RAISE EXCEPTION 'No primary applicant found for this property';
    END IF;
  ELSE
    RAISE EXCEPTION 'Either unit_id or property_id must be provided';
  END IF;

  -- Get the unit details and verify ownership
  SELECT pu.primary_applicant_id, p.id
  INTO v_user_id, v_property_id
  FROM property_units pu
  JOIN properties p ON pu.property_id = p.id
  WHERE pu.id = v_unit_id
    AND p.landlord_id = v_landlord_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Unit not found or not authorized';
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No primary applicant found for this unit';
  END IF;

  -- Clear the primary applicant from the unit
  UPDATE property_units
  SET 
    primary_applicant_id = NULL,
    updated_at = NOW()
  WHERE id = v_unit_id;

  -- Reactivate the listing
  UPDATE properties
  SET 
    listing_status = 'active',
    updated_at = NOW()
  WHERE id = v_property_id;

  -- Update marketplace_applications
  UPDATE marketplace_applications
  SET 
    is_primary_applicant = false,
    status = 'rejected',
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE unit_id = v_unit_id 
    AND user_id = v_user_id;

  -- Also update property_applications table
  UPDATE property_applications
  SET 
    is_primary_applicant = false,
    status = 'rejected',
    updated_at = NOW()
  WHERE (unit_id = v_unit_id OR (property_id = v_property_id AND unit_id IS NULL))
    AND tenant_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'unit_id', v_unit_id,
    'tenant_id', v_user_id,
    'property_id', v_property_id
  );
END;
$$;