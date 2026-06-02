-- Update landlord_deny_application to support account admins and portfolio managers
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

  -- Check if application exists and user has permission
  SELECT 
    ma.id IS NOT NULL,
    ma.status,
    ma.property_id,
    ma.unit_id
  INTO 
    v_application_exists,
    v_current_status,
    v_property_id,
    v_unit_id
  FROM marketplace_applications ma
  LEFT JOIN properties p ON p.id = ma.property_id
  WHERE ma.id = p_application_id
  AND (
    p.owner_id = v_landlord_id 
    OR v_is_admin
    OR is_account_admin(v_landlord_id)
    OR (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, v_landlord_id, ARRAY['admin_partner', 'editor']))
  );

  IF NOT v_application_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Application not found or you do not have permission to deny this application'
    );
  END IF;

  -- Update the application status to withdrawn
  UPDATE marketplace_applications
  SET 
    status = 'withdrawn',
    updated_at = now()
  WHERE id = p_application_id;

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