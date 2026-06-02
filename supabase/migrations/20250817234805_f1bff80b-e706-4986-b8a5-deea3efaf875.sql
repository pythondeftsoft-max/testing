-- Function to sanitize metadata
CREATE OR REPLACE FUNCTION public.sanitize_metadata(input_metadata JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sensitive_keys TEXT[] := ARRAY['email', 'token', 'authorization', 'password', 'set-cookie', 'cookie', 'api_key', 'secret', 'bearer'];
  sanitized JSONB := input_metadata;
  key TEXT;
BEGIN
  -- Remove or mask sensitive keys
  FOREACH key IN ARRAY sensitive_keys
  LOOP
    IF sanitized ? key THEN
      sanitized := sanitized - key || jsonb_build_object(key, '[REDACTED]');
    END IF;
  END LOOP;
  
  RETURN sanitized;
END;
$$;

-- Function to log RBAC events
CREATE OR REPLACE FUNCTION public.log_rbac_event(
  p_scope TEXT,
  p_object TEXT,
  p_action TEXT,
  p_portfolio_id UUID DEFAULT NULL,
  p_allowed BOOLEAN DEFAULT false,
  p_source TEXT DEFAULT 'client',
  p_route TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.rbac_audit_logs (
    user_id,
    scope,
    object,
    action,
    portfolio_id,
    allowed,
    source,
    route,
    user_agent,
    metadata
  ) VALUES (
    auth.uid(),
    p_scope,
    p_object,
    p_action,
    p_portfolio_id,
    p_allowed,
    p_source,
    p_route,
    p_user_agent,
    sanitize_metadata(p_metadata)
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail the main operation
    RETURN false;
END;
$$;

-- Function to get RBAC stats
CREATE OR REPLACE FUNCTION public.get_rbac_stats(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_scope TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_events BIGINT,
  denied_events BIGINT,
  allowed_events BIGINT,
  unique_users BIGINT,
  top_objects JSONB
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE allowed = false) as denied,
      COUNT(*) FILTER (WHERE allowed = true) as allowed,
      COUNT(DISTINCT user_id) as users
    FROM public.rbac_audit_logs 
    WHERE created_at::DATE BETWEEN p_start_date AND p_end_date
    AND (p_scope IS NULL OR scope = p_scope)
  ),
  top_obj AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'object', object,
        'count', cnt
      ) ORDER BY cnt DESC
    ) as objects
    FROM (
      SELECT object, COUNT(*) as cnt
      FROM public.rbac_audit_logs 
      WHERE created_at::DATE BETWEEN p_start_date AND p_end_date
      AND (p_scope IS NULL OR scope = p_scope)
      GROUP BY object
      ORDER BY cnt DESC
      LIMIT 10
    ) t
  )
  SELECT 
    s.total,
    s.denied,
    s.allowed,
    s.users,
    COALESCE(t.objects, '[]'::jsonb)
  FROM stats s
  CROSS JOIN top_obj t;
END;
$$;

-- Function to get account effective permissions
CREATE OR REPLACE FUNCTION public.get_account_effective_permissions(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  user_role account_role_type;
BEGIN
  -- Get user's highest account role
  SELECT get_highest_account_role(p_user_id) INTO user_role;
  
  -- If owner, return permissive permissions
  IF user_role = 'owner' THEN
    RETURN jsonb_build_object(
      'admin.rbac_logs', jsonb_build_object('view', true, 'edit', true, 'delete', true, 'create', true),
      'user_management', jsonb_build_object('view', true, 'edit', true, 'delete', true, 'create', true),
      'settings', jsonb_build_object('view', true, 'edit', true, 'delete', true, 'create', true)
    );
  ELSIF user_role = 'admin_partner' THEN
    RETURN jsonb_build_object(
      'admin.rbac_logs', jsonb_build_object('view', true, 'edit', false, 'delete', false, 'create', false),
      'user_management', jsonb_build_object('view', true, 'edit', true, 'delete', false, 'create', true)
    );
  ELSIF user_role = 'support_assistant' THEN
    RETURN jsonb_build_object(
      'admin.rbac_logs', jsonb_build_object('view', true, 'edit', false, 'delete', false, 'create', false)
    );
  END IF;
  
  -- Default: empty permissions (rely on role fallback)
  RETURN '{}'::jsonb;
END;
$$;

-- Function to get portfolio effective permissions
CREATE OR REPLACE FUNCTION public.get_portfolio_effective_permissions(p_user_id UUID, p_portfolio_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  user_portfolio_role portfolio_role_type;
BEGIN
  -- Get user's portfolio role
  SELECT get_user_portfolio_role(p_portfolio_id, p_user_id) INTO user_portfolio_role;
  
  -- Return permissions based on role
  IF user_portfolio_role = 'admin_partner' THEN
    RETURN jsonb_build_object(
      'analytics.dashboard', jsonb_build_object('view', true, 'edit', true, 'delete', true, 'create', true),
      'analytics.portfolio_trends', jsonb_build_object('view', true, 'edit', true, 'delete', true, 'create', true),
      'analytics.asset_allocation', jsonb_build_object('view', true, 'edit', true, 'delete', true, 'create', true),
      'properties', jsonb_build_object('view', true, 'edit', true, 'delete', true, 'create', true)
    );
  ELSIF user_portfolio_role = 'editor' THEN
    RETURN jsonb_build_object(
      'analytics.dashboard', jsonb_build_object('view', true, 'edit', true, 'delete', false, 'create', true),
      'properties', jsonb_build_object('view', true, 'edit', true, 'delete', false, 'create', true)
    );
  ELSIF user_portfolio_role = 'viewer' THEN
    RETURN jsonb_build_object(
      'analytics.dashboard', jsonb_build_object('view', true, 'edit', false, 'delete', false, 'create', false),
      'properties', jsonb_build_object('view', true, 'edit', false, 'delete', false, 'create', false)
    );
  END IF;
  
  -- Default: empty permissions
  RETURN '{}'::jsonb;
END;
$$;

-- Function to check account permission
CREATE OR REPLACE FUNCTION public.has_account_permission(
  p_user_id UUID,
  p_object TEXT,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  user_role account_role_type;
BEGIN
  -- Get user's highest account role
  SELECT get_highest_account_role(p_user_id) INTO user_role;
  
  -- Owner has all permissions
  IF user_role = 'owner' THEN
    RETURN true;
  END IF;
  
  -- Admin partner has limited permissions
  IF user_role = 'admin_partner' THEN
    CASE p_object
      WHEN 'admin.rbac_logs' THEN
        RETURN p_action = 'view';
      WHEN 'user_management' THEN
        RETURN p_action IN ('view', 'edit', 'create');
      ELSE
        RETURN false;
    END CASE;
  END IF;
  
  -- Support assistant has very limited permissions
  IF user_role = 'support_assistant' THEN
    RETURN p_object = 'admin.rbac_logs' AND p_action = 'view';
  END IF;
  
  -- Default: no permission
  RETURN false;
END;
$$;