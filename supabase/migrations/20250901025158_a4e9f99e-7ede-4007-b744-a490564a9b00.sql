-- Add missing RBAC functions for full portfolio management implementation

-- Function to check portfolio permissions
CREATE OR REPLACE FUNCTION public.has_portfolio_permission(
  p_user_id UUID,
  p_portfolio_id UUID,
  p_object TEXT,
  p_action TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role portfolio_role_type;
  has_permission BOOLEAN := false;
BEGIN
  -- Get user's role in the portfolio
  SELECT role_name INTO user_role
  FROM portfolio_roles
  WHERE user_id = p_user_id 
    AND portfolio_id = p_portfolio_id
    AND is_active = true
  ORDER BY 
    CASE role_name 
      WHEN 'admin_partner' THEN 1
      WHEN 'editor' THEN 2
      WHEN 'viewer' THEN 3
      WHEN 'maintenance' THEN 4
    END
  LIMIT 1;

  -- If no role found, return false
  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Check permission in portfolio_role_permissions table
  SELECT 
    CASE p_action
      WHEN 'view' THEN prp.can_view
      WHEN 'edit' THEN prp.can_edit
      WHEN 'delete' THEN prp.can_delete
      WHEN 'create' THEN prp.can_create
      ELSE false
    END INTO has_permission
  FROM portfolio_role_permissions prp
  JOIN permission_objects po ON prp.permission_object_id = po.id
  WHERE prp.role_name = user_role
    AND po.name = p_object
    AND po.scope = 'portfolio';

  RETURN COALESCE(has_permission, false);
END;
$$;

-- Function to check account permissions
CREATE OR REPLACE FUNCTION public.has_account_permission(
  p_user_id UUID,
  p_object TEXT,
  p_action TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role account_role_type;
  has_permission BOOLEAN := false;
BEGIN
  -- Get user's highest account role
  SELECT role_name INTO user_role
  FROM account_roles
  WHERE user_id = p_user_id 
    AND is_active = true
  ORDER BY 
    CASE role_name 
      WHEN 'owner' THEN 1
      WHEN 'admin_partner' THEN 2
      WHEN 'support_assistant' THEN 3
    END
  LIMIT 1;

  -- If no role found, return false
  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Check permission in role_permissions table
  SELECT 
    CASE p_action
      WHEN 'view' THEN rp.can_view
      WHEN 'edit' THEN rp.can_edit
      WHEN 'delete' THEN rp.can_delete
      WHEN 'create' THEN rp.can_create
      ELSE false
    END INTO has_permission
  FROM role_permissions rp
  JOIN permission_objects po ON rp.permission_object_id = po.id
  WHERE rp.role_name = user_role::text
    AND po.name = p_object
    AND po.scope = 'account';

  RETURN COALESCE(has_permission, false);
END;
$$;

-- Function to get portfolio effective permissions
CREATE OR REPLACE FUNCTION public.get_portfolio_effective_permissions(
  p_user_id UUID,
  p_portfolio_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  user_role portfolio_role_type;
  permissions_result JSONB := '{}';
  perm_record RECORD;
BEGIN
  -- Get user's role in the portfolio
  SELECT role_name INTO user_role
  FROM portfolio_roles
  WHERE user_id = p_user_id 
    AND portfolio_id = p_portfolio_id
    AND is_active = true
  ORDER BY 
    CASE role_name 
      WHEN 'admin_partner' THEN 1
      WHEN 'editor' THEN 2
      WHEN 'viewer' THEN 3
      WHEN 'maintenance' THEN 4
    END
  LIMIT 1;

  -- If no role found, return empty permissions
  IF user_role IS NULL THEN
    RETURN permissions_result;
  END IF;

  -- Build permissions object
  FOR perm_record IN
    SELECT 
      po.name as object_name,
      prp.can_view,
      prp.can_edit,
      prp.can_delete,
      prp.can_create
    FROM portfolio_role_permissions prp
    JOIN permission_objects po ON prp.permission_object_id = po.id
    WHERE prp.role_name = user_role
      AND po.scope = 'portfolio'
  LOOP
    permissions_result := permissions_result || jsonb_build_object(
      perm_record.object_name,
      jsonb_build_object(
        'view', perm_record.can_view,
        'edit', perm_record.can_edit,
        'delete', perm_record.can_delete,
        'create', perm_record.can_create
      )
    );
  END LOOP;

  RETURN permissions_result;
END;
$$;

-- Function to get account effective permissions
CREATE OR REPLACE FUNCTION public.get_account_effective_permissions(
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  user_role account_role_type;
  permissions_result JSONB := '{}';
  perm_record RECORD;
BEGIN
  -- Get user's highest account role
  SELECT role_name INTO user_role
  FROM account_roles
  WHERE user_id = p_user_id 
    AND is_active = true
  ORDER BY 
    CASE role_name 
      WHEN 'owner' THEN 1
      WHEN 'admin_partner' THEN 2
      WHEN 'support_assistant' THEN 3
    END
  LIMIT 1;

  -- If no role found, return empty permissions
  IF user_role IS NULL THEN
    RETURN permissions_result;
  END IF;

  -- Build permissions object
  FOR perm_record IN
    SELECT 
      po.name as object_name,
      rp.can_view,
      rp.can_edit,
      rp.can_delete,
      rp.can_create
    FROM role_permissions rp
    JOIN permission_objects po ON rp.permission_object_id = po.id
    WHERE rp.role_name = user_role::text
      AND po.scope = 'account'
  LOOP
    permissions_result := permissions_result || jsonb_build_object(
      perm_record.object_name,
      jsonb_build_object(
        'view', perm_record.can_view,
        'edit', perm_record.can_edit,
        'delete', perm_record.can_delete,
        'create', perm_record.can_create
      )
    );
  END LOOP;

  RETURN permissions_result;
END;
$$;

-- Function to get RBAC audit summary
CREATE OR REPLACE FUNCTION public.get_rbac_audit_summary(
  p_timeframe TEXT DEFAULT '30d'
) RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  time_filter TIMESTAMP WITH TIME ZONE;
  summary_result JSONB;
BEGIN
  -- Calculate time filter based on timeframe
  CASE p_timeframe
    WHEN '7d' THEN time_filter := NOW() - INTERVAL '7 days';
    WHEN '30d' THEN time_filter := NOW() - INTERVAL '30 days';
    WHEN '90d' THEN time_filter := NOW() - INTERVAL '90 days';
    ELSE time_filter := NOW() - INTERVAL '30 days';
  END CASE;

  -- Build summary from rbac_change_logs
  SELECT jsonb_build_object(
    'total_changes', COUNT(*),
    'role_grants', COUNT(*) FILTER (WHERE change_type = 'role_granted'),
    'role_revokes', COUNT(*) FILTER (WHERE change_type = 'role_revoked'),
    'permission_updates', COUNT(*) FILTER (WHERE change_type = 'permission_updated'),
    'recent_activity', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'change_type', change_type,
          'actor_user_id', actor_user_id,
          'target_user_id', target_user_id,
          'portfolio_id', portfolio_id,
          'created_at', created_at
        )
      )
      FROM (
        SELECT *
        FROM rbac_change_logs
        WHERE created_at >= time_filter
        ORDER BY created_at DESC
        LIMIT 10
      ) recent
    ),
    'change_breakdown', (
      SELECT jsonb_object_agg(change_type, count)
      FROM (
        SELECT change_type, COUNT(*) as count
        FROM rbac_change_logs
        WHERE created_at >= time_filter
        GROUP BY change_type
      ) breakdown
    )
  ) INTO summary_result
  FROM rbac_change_logs
  WHERE created_at >= time_filter;

  RETURN COALESCE(summary_result, '{}'::jsonb);
END;
$$;

-- Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_portfolio_roles_user_portfolio_active 
ON portfolio_roles (user_id, portfolio_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_account_roles_user_active 
ON account_roles (user_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_rbac_change_logs_created_at 
ON rbac_change_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_role_permissions_role_object 
ON portfolio_role_permissions (role_name, permission_object_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_object 
ON role_permissions (role_name, permission_object_id);