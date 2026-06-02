-- Fix get_user_action_type function to handle both system_admins and account_roles correctly
CREATE OR REPLACE FUNCTION get_user_action_type(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First check system_admins table for system-level roles
  IF EXISTS (
    SELECT 1 FROM system_admins 
    WHERE system_admins.user_id = get_user_action_type.user_id 
    AND role IN ('super_admin', 'operations_admin')
    AND is_active = true
  ) THEN
    RETURN 'admin';
  END IF;

  -- Check for matchmaker role in system_admins
  IF EXISTS (
    SELECT 1 FROM system_admins 
    WHERE system_admins.user_id = get_user_action_type.user_id 
    AND role = 'matchmaker'
    AND is_active = true
  ) THEN
    RETURN 'worker';
  END IF;

  -- Then check account_roles table for account-level admin roles
  IF EXISTS (
    SELECT 1 FROM account_roles 
    WHERE account_roles.user_id = get_user_action_type.user_id 
    AND role_name IN ('owner', 'admin_partner')
    AND is_active = true
  ) THEN
    RETURN 'admin';
  END IF;

  -- Check for account-level worker roles
  IF EXISTS (
    SELECT 1 FROM account_roles 
    WHERE account_roles.user_id = get_user_action_type.user_id 
    AND role_name IN ('editor', 'maintenance')
    AND is_active = true
  ) THEN
    RETURN 'worker';
  END IF;

  -- Check for account-level viewer roles
  IF EXISTS (
    SELECT 1 FROM account_roles 
    WHERE account_roles.user_id = get_user_action_type.user_id 
    AND role_name IN ('viewer', 'support_assistant')
    AND is_active = true
  ) THEN
    RETURN 'viewer';
  END IF;

  -- Default to system if no role found
  RETURN 'system';
END;
$$;