-- Configure account role permissions for portfolio management
-- This enables account-level roles to see all portfolios

-- First, get the permission_object_id for admin.portfolio_management
DO $$
DECLARE
  v_permission_object_id UUID;
BEGIN
  -- Get the permission object ID
  SELECT id INTO v_permission_object_id
  FROM permission_objects
  WHERE name = 'admin.portfolio_management' AND scope = 'account';

  -- If it doesn't exist, create it
  IF v_permission_object_id IS NULL THEN
    INSERT INTO permission_objects (name, display_name, description, category, scope)
    VALUES (
      'admin.portfolio_management',
      'Portfolio Management',
      'Manage portfolios across the account',
      'admin',
      'account'
    )
    RETURNING id INTO v_permission_object_id;
  END IF;

  -- Configure permissions for owner role
  INSERT INTO account_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
  VALUES ('owner', v_permission_object_id, true, true, true, true)
  ON CONFLICT (role_name, permission_object_id) 
  DO UPDATE SET can_view = true, can_edit = true, can_delete = true, can_create = true;

  -- Configure permissions for admin_partner role
  INSERT INTO account_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
  VALUES ('admin_partner', v_permission_object_id, true, true, true, true)
  ON CONFLICT (role_name, permission_object_id) 
  DO UPDATE SET can_view = true, can_edit = true, can_delete = true, can_create = true;

  -- Configure permissions for support_assistant role (view only)
  INSERT INTO account_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
  VALUES ('support_assistant', v_permission_object_id, true, false, false, false)
  ON CONFLICT (role_name, permission_object_id) 
  DO UPDATE SET can_view = true, can_edit = false, can_delete = false, can_create = false;
END $$;

-- Create function to get user accessible portfolios based on account role
CREATE OR REPLACE FUNCTION get_user_accessible_portfolios(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  client_name TEXT,
  property_count BIGINT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user has ANY active account role
  IF EXISTS (
    SELECT 1 FROM account_roles 
    WHERE user_id = p_user_id AND is_active = true
  ) THEN
    -- Return ALL portfolios if they have an account role
    RETURN QUERY
    SELECT 
      p.id,
      p.client_name,
      COALESCE(COUNT(prop.id), 0)::BIGINT as property_count
    FROM portfolios p
    LEFT JOIN properties prop ON p.id = prop.portfolio_id
    GROUP BY p.id, p.client_name
    ORDER BY p.client_name;
  ELSE
    -- Return only owned + explicitly granted portfolios for regular users
    RETURN QUERY
    SELECT DISTINCT
      p.id,
      p.client_name,
      COALESCE(COUNT(prop.id), 0)::BIGINT as property_count
    FROM portfolios p
    LEFT JOIN properties prop ON p.id = prop.portfolio_id
    LEFT JOIN portfolio_roles pr ON p.id = pr.portfolio_id 
      AND pr.user_id = p_user_id 
      AND pr.is_active = true
    WHERE p.manager_id = p_user_id OR pr.id IS NOT NULL
    GROUP BY p.id, p.client_name
    ORDER BY p.client_name;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_accessible_portfolios(UUID) TO authenticated;