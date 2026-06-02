
-- Create secure function for landlords to deny applications
CREATE OR REPLACE FUNCTION landlord_deny_application(
  p_application_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application RECORD;
  v_landlord_id UUID;
BEGIN
  v_landlord_id := auth.uid();
  
  -- Get application and verify landlord owns the property
  SELECT ma.*, p.owner_id 
  INTO v_application
  FROM marketplace_applications ma
  JOIN properties p ON ma.property_id = p.id
  WHERE ma.id = p_application_id
  AND p.owner_id = v_landlord_id;
  
  IF v_application IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Application not found or you do not own this property'
    );
  END IF;
  
  -- Update the application status to withdrawn
  UPDATE marketplace_applications
  SET status = 'withdrawn',
      updated_at = now()
  WHERE id = p_application_id;
  
  RETURN json_build_object(
    'success', true,
    'application_id', p_application_id,
    'tenant_id', v_application.user_id,
    'property_id', v_application.property_id
  );
END;
$$;
