-- Create unified activity feed function that combines all log sources
CREATE OR REPLACE FUNCTION get_unified_activity_feed(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_activity_type TEXT DEFAULT NULL,
  p_user_type TEXT DEFAULT NULL,
  p_risk_level TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_time_range INTERVAL DEFAULT INTERVAL '30 days',
  p_search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  event_timestamp TIMESTAMPTZ,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_type TEXT,
  activity_type TEXT,
  description TEXT,
  ip_address TEXT,
  location TEXT,
  device TEXT,
  browser TEXT,
  risk_score INTEGER,
  status TEXT,
  source TEXT,
  metadata JSONB
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH rbac_logs AS (
    SELECT
      rel.id::TEXT as id,
      rel.created_at as event_timestamp,
      rel.user_id,
      COALESCE(p.first_name || ' ' || p.last_name, 'Unknown User') as user_name,
      COALESCE(au.email, 'unknown@example.com') as user_email,
      CASE 
        WHEN p.user_type IS NOT NULL THEN p.user_type
        ELSE 'user'
      END as user_type,
      CASE
        WHEN rel.scope = 'portfolio' AND rel.action = 'view' THEN 'portfolio_access'
        WHEN rel.scope = 'portfolio' AND rel.action = 'edit' THEN 'portfolio_update'
        WHEN rel.scope = 'account' AND rel.action = 'view' THEN 'account_access'
        WHEN rel.scope = 'account' AND rel.action = 'edit' THEN 'account_update'
        ELSE 'rbac_' || rel.action
      END as activity_type,
      CASE
        WHEN rel.allowed THEN 'Accessed ' || rel.object_name || ' in ' || rel.scope
        ELSE 'Blocked attempt to access ' || rel.object_name || ' in ' || rel.scope
      END as description,
      COALESCE(rel.ip_address, 'Unknown') as ip_address,
      COALESCE((rel.metadata->>'location')::TEXT, 'Unknown') as location,
      COALESCE((rel.metadata->>'device')::TEXT, 'Unknown') as device,
      COALESCE(rel.user_agent, 'Unknown') as browser,
      CASE
        WHEN NOT rel.allowed THEN 7
        WHEN rel.action = 'delete' THEN 6
        WHEN rel.action = 'edit' THEN 4
        ELSE 2
      END as risk_score,
      CASE
        WHEN rel.allowed THEN 'success'
        ELSE 'blocked'
      END as status,
      'rbac' as source,
      rel.metadata
    FROM rbac_event_logs rel
    LEFT JOIN profiles p ON rel.user_id = p.id
    LEFT JOIN auth.users au ON rel.user_id = au.id
    WHERE rel.created_at > NOW() - p_time_range
  ),
  account_logs AS (
    SELECT
      aal.id::TEXT as id,
      aal.created_at as event_timestamp,
      aal.performed_by as user_id,
      COALESCE(p.first_name || ' ' || p.last_name, 'Unknown User') as user_name,
      COALESCE(au.email, 'unknown@example.com') as user_email,
      CASE 
        WHEN p.user_type IS NOT NULL THEN p.user_type
        ELSE 'user'
      END as user_type,
      CASE
        WHEN aal.action_type = 'profile_update' THEN 'account_update'
        WHEN aal.action_type = 'password_change' THEN 'security_update'
        WHEN aal.action_type = 'email_change' THEN 'account_update'
        ELSE aal.action_type
      END as activity_type,
      aal.description,
      COALESCE(aal.ip_address, 'Unknown') as ip_address,
      'Unknown' as location,
      'Unknown' as device,
      'Unknown' as browser,
      CASE
        WHEN aal.action_type LIKE '%password%' THEN 6
        WHEN aal.action_type LIKE '%delete%' THEN 7
        WHEN aal.action_type LIKE '%update%' THEN 4
        ELSE 2
      END as risk_score,
      'success' as status,
      'account' as source,
      aal.details as metadata
    FROM account_activity_log aal
    LEFT JOIN profiles p ON aal.performed_by = p.id
    LEFT JOIN auth.users au ON aal.performed_by = au.id
    WHERE aal.created_at > NOW() - p_time_range
  ),
  admin_logs AS (
    SELECT
      aal.id::TEXT as id,
      aal.created_at as event_timestamp,
      aal.admin_user_id as user_id,
      COALESCE(p.first_name || ' ' || p.last_name, 'Admin User') as user_name,
      COALESCE(au.email, 'admin@example.com') as user_email,
      'admin' as user_type,
      'admin_action' as activity_type,
      aal.action || ' ' || aal.resource_type || COALESCE(' (ID: ' || aal.resource_id || ')', '') as description,
      COALESCE(aal.ip_address, 'Unknown') as ip_address,
      'Unknown' as location,
      'Unknown' as device,
      'Unknown' as browser,
      CASE
        WHEN aal.action IN ('delete', 'force_delete') THEN 8
        WHEN aal.action IN ('update', 'edit') THEN 6
        WHEN aal.action = 'create' THEN 4
        ELSE 3
      END as risk_score,
      'success' as status,
      'admin' as source,
      aal.metadata
    FROM admin_action_logs aal
    LEFT JOIN profiles p ON aal.admin_user_id = p.id
    LEFT JOIN auth.users au ON aal.admin_user_id = au.id
    WHERE aal.created_at > NOW() - p_time_range
  ),
  unified AS (
    SELECT * FROM rbac_logs
    UNION ALL
    SELECT * FROM account_logs
    UNION ALL
    SELECT * FROM admin_logs
  )
  SELECT *
  FROM unified
  WHERE
    (p_activity_type IS NULL OR p_activity_type = 'all' OR activity_type = p_activity_type)
    AND (p_user_type IS NULL OR p_user_type = 'all' OR user_type = p_user_type)
    AND (p_status IS NULL OR p_status = 'all' OR status = p_status)
    AND (p_risk_level IS NULL OR p_risk_level = 'all' OR 
      CASE p_risk_level
        WHEN 'low' THEN risk_score <= 3
        WHEN 'medium' THEN risk_score BETWEEN 4 AND 6
        WHEN 'high' THEN risk_score >= 7
        ELSE TRUE
      END)
    AND (p_search_query IS NULL OR p_search_query = '' OR
      user_name ILIKE '%' || p_search_query || '%' OR
      user_email ILIKE '%' || p_search_query || '%' OR
      description ILIKE '%' || p_search_query || '%')
  ORDER BY event_timestamp DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rbac_event_logs_created_at_user ON rbac_event_logs(created_at DESC, user_id);
CREATE INDEX IF NOT EXISTS idx_account_activity_log_created_at_user ON account_activity_log(created_at DESC, performed_by);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at_user ON admin_action_logs(created_at DESC, admin_user_id);

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_unified_activity_feed TO authenticated;