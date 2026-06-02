-- Fix trigger functions to remove invalid case_manager references from system_admin role checks
-- case_manager only exists in account_roles, not in system_admins

-- Update log_tenant_stage_change trigger function
CREATE OR REPLACE FUNCTION log_tenant_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action_type text;
  v_performed_by uuid;
  v_actor_name text;
BEGIN
  -- Determine who performed the action
  IF NEW.last_modified_by IS NOT NULL THEN
    v_performed_by := NEW.last_modified_by;
  ELSE
    v_performed_by := auth.uid();
  END IF;

  -- Get action type based on user's role priority
  SELECT 
    COALESCE(p.full_name, p.email, 'System') as actor_name,
    CASE 
      -- Check system admins first (highest priority)
      WHEN EXISTS (
        SELECT 1 FROM system_admins sa
        WHERE sa.user_id = v_performed_by 
        AND sa.is_active = true
        ORDER BY 
          CASE sa.role_name
            WHEN 'super_admin' THEN 1
            WHEN 'operations_admin' THEN 2
            WHEN 'matchmaker' THEN 3
            ELSE 4
          END
        LIMIT 1
      ) THEN 'admin'
      -- Then check account roles
      WHEN EXISTS (
        SELECT 1 FROM account_roles ar
        WHERE ar.user_id = v_performed_by 
        AND ar.is_active = true
        AND ar.role_name IN ('owner', 'admin_partner')
      ) THEN 'admin'
      WHEN EXISTS (
        SELECT 1 FROM account_roles ar
        WHERE ar.user_id = v_performed_by 
        AND ar.is_active = true
        AND ar.role_name IN ('editor', 'maintenance', 'case_manager')
      ) THEN 'worker'
      ELSE 'system'
    END as action_type
  INTO v_actor_name, v_action_type
  FROM profiles p
  WHERE p.id = v_performed_by;

  -- Insert activity log with proper action type
  INSERT INTO account_activity_log (
    action_type,
    target_user_id,
    performed_by,
    details
  ) VALUES (
    v_action_type,
    NEW.id,
    v_performed_by,
    jsonb_build_object(
      'tenant_id', NEW.id,
      'old_stage', OLD.tenant_stage,
      'new_stage', NEW.tenant_stage,
      'actor_name', v_actor_name,
      'timestamp', now()
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update log_property_unit_stage_change trigger function
CREATE OR REPLACE FUNCTION log_property_unit_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action_type text;
  v_performed_by uuid;
  v_actor_name text;
BEGIN
  -- Determine who performed the action
  IF NEW.last_modified_by IS NOT NULL THEN
    v_performed_by := NEW.last_modified_by;
  ELSE
    v_performed_by := auth.uid();
  END IF;

  -- Get action type based on user's role priority
  SELECT 
    COALESCE(p.full_name, p.email, 'System') as actor_name,
    CASE 
      -- Check system admins first (highest priority)
      WHEN EXISTS (
        SELECT 1 FROM system_admins sa
        WHERE sa.user_id = v_performed_by 
        AND sa.is_active = true
        ORDER BY 
          CASE sa.role_name
            WHEN 'super_admin' THEN 1
            WHEN 'operations_admin' THEN 2
            WHEN 'matchmaker' THEN 3
            ELSE 4
          END
        LIMIT 1
      ) THEN 'admin'
      -- Then check account roles
      WHEN EXISTS (
        SELECT 1 FROM account_roles ar
        WHERE ar.user_id = v_performed_by 
        AND ar.is_active = true
        AND ar.role_name IN ('owner', 'admin_partner')
      ) THEN 'admin'
      WHEN EXISTS (
        SELECT 1 FROM account_roles ar
        WHERE ar.user_id = v_performed_by 
        AND ar.is_active = true
        AND ar.role_name IN ('editor', 'maintenance', 'case_manager')
      ) THEN 'worker'
      ELSE 'system'
    END as action_type
  INTO v_actor_name, v_action_type
  FROM profiles p
  WHERE p.id = v_performed_by;

  -- Insert activity log with proper action type
  INSERT INTO account_activity_log (
    action_type,
    target_user_id,
    performed_by,
    details
  ) VALUES (
    v_action_type,
    NEW.id,
    v_performed_by,
    jsonb_build_object(
      'unit_id', NEW.id,
      'old_stage', OLD.unit_stage,
      'new_stage', NEW.unit_stage,
      'actor_name', v_actor_name,
      'timestamp', now()
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;