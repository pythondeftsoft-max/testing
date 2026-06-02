-- Fix landlord_deny_application to correctly handle tenant_id vs user_id
CREATE OR REPLACE FUNCTION public.landlord_deny_application(
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
  v_table_name TEXT;
  v_is_admin BOOLEAN;
BEGIN
  v_landlord_id := auth.uid();
  v_is_admin := is_admin(v_landlord_id);
  
  -- First try marketplace_applications
  -- Allow if owner OR admin
  SELECT ma.*, p.owner_id, 'marketplace_applications' as source_table
  INTO v_application
  FROM marketplace_applications ma
  JOIN properties p ON ma.property_id = p.id
  WHERE ma.id = p_application_id
  AND (p.owner_id = v_landlord_id OR v_is_admin);
  
  IF v_application IS NOT NULL THEN
    v_table_name := 'marketplace_applications';
  ELSE
    -- Try property_applications
    SELECT pa.*, p.owner_id, 'property_applications' as source_table
    INTO v_application
    FROM property_applications pa
    JOIN properties p ON pa.property_id = p.id
    WHERE pa.id = p_application_id
    AND (p.owner_id = v_landlord_id OR v_is_admin);
    
    IF v_application IS NOT NULL THEN
      v_table_name := 'property_applications';
    END IF;
  END IF;
  
  IF v_application IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Application not found or you do not have permission'
    );
  END IF;
  
  -- Update the correct table
  IF v_table_name = 'marketplace_applications' THEN
    UPDATE marketplace_applications
    SET status = 'withdrawn', updated_at = now()
    WHERE id = p_application_id;
  ELSE
    UPDATE property_applications
    SET status = 'withdrawn', status_updated_at = now()
    WHERE id = p_application_id;
  END IF;
  
  -- Fix: Use CASE to handle both tenant_id and user_id columns
  RETURN json_build_object(
    'success', true,
    'application_id', p_application_id,
    'tenant_id', CASE 
      WHEN v_table_name = 'marketplace_applications' THEN v_application.user_id
      ELSE v_application.tenant_id
    END,
    'property_id', v_application.property_id,
    'source_table', v_table_name
  );
END;
$$;