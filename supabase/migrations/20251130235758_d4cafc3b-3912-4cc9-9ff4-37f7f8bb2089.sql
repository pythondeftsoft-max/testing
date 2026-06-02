-- Simplify landlord_deny_application by removing broken has_portfolio_role check
CREATE OR REPLACE FUNCTION landlord_deny_application(p_application_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_id UUID;
  v_is_admin BOOLEAN;
  v_application_exists BOOLEAN;
  v_current_status TEXT;
  v_property_id UUID;
  v_unit_id UUID;
  v_marketplace_id UUID;
BEGIN
  -- Get the current user's ID
  v_landlord_id := auth.uid();
  
  IF v_landlord_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Check if user is system admin
  v_is_admin := is_admin(v_landlord_id);

  -- First, try to find the application in marketplace_applications
  SELECT 
    ma.id IS NOT NULL,
    ma.status,
    ma.property_id,
    ma.unit_id,
    ma.id
  INTO 
    v_application_exists,
    v_current_status,
    v_property_id,
    v_unit_id,
    v_marketplace_id
  FROM marketplace_applications ma
  LEFT JOIN properties p ON p.id = ma.property_id
  WHERE ma.id = p_application_id
  AND (
    p.owner_id = v_landlord_id 
    OR v_is_admin
    OR is_account_admin(v_landlord_id)
  );

  -- If not found in marketplace_applications, check property_applications
  IF NOT v_application_exists THEN
    SELECT 
      ma.id IS NOT NULL,
      ma.status,
      ma.property_id,
      ma.unit_id,
      ma.id
    INTO 
      v_application_exists,
      v_current_status,
      v_property_id,
      v_unit_id,
      v_marketplace_id
    FROM property_applications pa
    JOIN marketplace_applications ma ON ma.id = pa.marketplace_application_id
    JOIN properties p ON p.id = pa.property_id
    WHERE pa.id = p_application_id
    AND (
      p.owner_id = v_landlord_id 
      OR v_is_admin
      OR is_account_admin(v_landlord_id)
    );
  END IF;

  IF NOT v_application_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Application not found or you do not have permission to deny this application'
    );
  END IF;

  -- Update the marketplace application status to withdrawn
  UPDATE marketplace_applications
  SET 
    status = 'withdrawn',
    updated_at = now()
  WHERE id = v_marketplace_id;

  -- Update unit pipeline if unit exists
  IF v_unit_id IS NOT NULL THEN
    UPDATE property_units
    SET pipeline_stage = 'available'
    WHERE id = v_unit_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Application denied successfully'
  );
END;
$$;