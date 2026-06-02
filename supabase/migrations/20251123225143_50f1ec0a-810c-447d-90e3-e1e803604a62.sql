-- Drop and recreate admin functions to use marketplace_applications instead of property_applications

-- 1. Update admin_list_property_applications
DROP FUNCTION IF EXISTS admin_list_property_applications(uuid, text, text);

CREATE OR REPLACE FUNCTION admin_list_property_applications(
  p_property_id uuid,
  p_status text DEFAULT 'all',
  p_search text DEFAULT ''
)
RETURNS TABLE (
  id uuid,
  property_id uuid,
  unit_id uuid,
  tenant_id uuid,
  status text,
  priority_payment_made boolean,
  priority_payment_amount numeric,
  created_at timestamptz,
  updated_at timestamptz,
  tenant_first_name text,
  tenant_last_name text,
  tenant_phone text,
  unit_number text,
  unit_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ma.id,
    ma.property_id,
    ma.unit_id,
    ma.user_id as tenant_id,
    ma.lifecycle_stage as status,
    ma.priority_payment_made,
    ma.priority_payment_amount,
    ma.created_at,
    ma.updated_at,
    p.first_name as tenant_first_name,
    p.last_name as tenant_last_name,
    p.phone_number as tenant_phone,
    pu.unit_number,
    pu.unit_name
  FROM marketplace_applications ma
  LEFT JOIN profiles p ON p.id = ma.user_id
  LEFT JOIN property_units pu ON pu.id = ma.unit_id
  WHERE ma.property_id = p_property_id
    AND (p_status = 'all' OR ma.lifecycle_stage = p_status)
    AND (
      p_search = '' 
      OR p.first_name ILIKE '%' || p_search || '%'
      OR p.last_name ILIKE '%' || p_search || '%'
      OR p.email ILIKE '%' || p_search || '%'
      OR pu.unit_number ILIKE '%' || p_search || '%'
    )
  ORDER BY ma.created_at DESC;
END;
$$;

-- 2. Update admin_update_application_status
DROP FUNCTION IF EXISTS admin_update_application_status(uuid, text, text, jsonb);

CREATE OR REPLACE FUNCTION admin_update_application_status(
  p_application_id uuid,
  p_new_status text,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_old_status text;
  v_user_id uuid;
BEGIN
  -- Get admin user ID from context
  v_admin_id := auth.uid();
  
  -- Get old status and user_id
  SELECT lifecycle_stage, user_id 
  INTO v_old_status, v_user_id
  FROM marketplace_applications 
  WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  
  -- Update the application status
  UPDATE marketplace_applications
  SET 
    lifecycle_stage = p_new_status,
    updated_at = now()
  WHERE id = p_application_id;
  
  -- Log the action
  INSERT INTO admin_action_logs (
    admin_user_id,
    action,
    resource_type,
    resource_id,
    reason,
    details
  ) VALUES (
    v_admin_id,
    'update_application_status',
    'marketplace_application',
    p_application_id,
    p_reason,
    jsonb_build_object(
      'old_status', v_old_status,
      'new_status', p_new_status,
      'metadata', p_metadata
    )
  );
END;
$$;

-- 3. Update admin_bulk_update_application_status
DROP FUNCTION IF EXISTS admin_bulk_update_application_status(uuid[], text, text, jsonb);

CREATE OR REPLACE FUNCTION admin_bulk_update_application_status(
  p_application_ids uuid[],
  p_new_status text,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_updated_count integer;
  v_app_id uuid;
BEGIN
  -- Get admin user ID from context
  v_admin_id := auth.uid();
  
  -- Update all applications
  UPDATE marketplace_applications
  SET 
    lifecycle_stage = p_new_status,
    updated_at = now()
  WHERE id = ANY(p_application_ids);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Log each action
  FOREACH v_app_id IN ARRAY p_application_ids
  LOOP
    INSERT INTO admin_action_logs (
      admin_user_id,
      action,
      resource_type,
      resource_id,
      reason,
      details
    ) VALUES (
      v_admin_id,
      'bulk_update_application_status',
      'marketplace_application',
      v_app_id,
      p_reason,
      jsonb_build_object(
        'new_status', p_new_status,
        'bulk_operation', true,
        'metadata', p_metadata
      )
    );
  END LOOP;
  
  RETURN v_updated_count;
END;
$$;

-- 4. Update admin_reassign_application_unit
DROP FUNCTION IF EXISTS admin_reassign_application_unit(uuid, uuid, text, jsonb);

CREATE OR REPLACE FUNCTION admin_reassign_application_unit(
  p_application_id uuid,
  p_target_unit_id uuid,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_old_unit_id uuid;
  v_user_id uuid;
BEGIN
  -- Get admin user ID from context
  v_admin_id := auth.uid();
  
  -- Get old unit_id and user_id
  SELECT unit_id, user_id 
  INTO v_old_unit_id, v_user_id
  FROM marketplace_applications 
  WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  
  -- Update the application unit
  UPDATE marketplace_applications
  SET 
    unit_id = p_target_unit_id,
    updated_at = now()
  WHERE id = p_application_id;
  
  -- Log the action
  INSERT INTO admin_action_logs (
    admin_user_id,
    action,
    resource_type,
    resource_id,
    reason,
    details
  ) VALUES (
    v_admin_id,
    'reassign_application_unit',
    'marketplace_application',
    p_application_id,
    p_reason,
    jsonb_build_object(
      'old_unit_id', v_old_unit_id,
      'new_unit_id', p_target_unit_id,
      'user_id', v_user_id,
      'metadata', p_metadata
    )
  );
END;
$$;