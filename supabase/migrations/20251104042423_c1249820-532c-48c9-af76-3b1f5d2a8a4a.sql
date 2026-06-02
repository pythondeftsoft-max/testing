-- Fix the get_unified_activity_feed function to use correct JOIN on profiles table
-- The profiles table uses 'id' as the primary key, not 'user_id'

DROP FUNCTION IF EXISTS get_unified_activity_feed(timestamptz, timestamptz, text, text, text, text, text);

CREATE OR REPLACE FUNCTION get_unified_activity_feed(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_activity_type text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_portfolio_id uuid DEFAULT NULL,
  p_search_query text DEFAULT NULL,
  p_time_range text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_name text,
  user_type user_type,
  activity_type text,
  activity_category text,
  description text,
  metadata jsonb,
  created_at timestamptz,
  portfolio_id uuid,
  portfolio_name text,
  ip_address inet,
  user_agent text
) AS $$
DECLARE
  v_start_date timestamptz;
  v_end_date timestamptz;
BEGIN
  -- Handle time range filters
  v_end_date := COALESCE(p_end_date, NOW());
  
  CASE p_time_range
    WHEN 'today' THEN
      v_start_date := date_trunc('day', NOW());
    WHEN 'week' THEN
      v_start_date := date_trunc('week', NOW());
    WHEN 'month' THEN
      v_start_date := date_trunc('month', NOW());
    WHEN 'year' THEN
      v_start_date := date_trunc('year', NOW());
    ELSE
      v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  END CASE;

  RETURN QUERY
  WITH rbac_logs AS (
    SELECT 
      rel.id,
      rel.user_id,
      COALESCE(
        p.first_name || ' ' || p.last_name,
        p.first_name,
        'Unknown User'
      ) as user_name,
      COALESCE(p.user_type, 'tenant'::user_type) as user_type,
      'rbac_action' as activity_type,
      rel.scope as activity_category,
      rel.object_name || ' - ' || rel.action as description,
      jsonb_build_object(
        'scope', rel.scope,
        'object', rel.object_name,
        'action', rel.action,
        'allowed', rel.allowed,
        'source', rel.source,
        'route', rel.route
      ) as metadata,
      rel.created_at,
      rel.portfolio_id,
      po.name as portfolio_name,
      rel.ip_address,
      rel.user_agent
    FROM rbac_event_logs rel
    LEFT JOIN profiles p ON p.id = rel.user_id
    LEFT JOIN portfolios po ON po.id = rel.portfolio_id
    WHERE rel.created_at BETWEEN v_start_date AND v_end_date
  ),
  admin_logs AS (
    SELECT 
      aal.id,
      aal.admin_user_id as user_id,
      COALESCE(
        p.first_name || ' ' || p.last_name,
        p.first_name,
        'Unknown Admin'
      ) as user_name,
      COALESCE(p.user_type, 'admin'::user_type) as user_type,
      aal.action as activity_type,
      'admin' as activity_category,
      aal.action || ' on ' || aal.resource_type as description,
      jsonb_build_object(
        'resource_type', aal.resource_type,
        'resource_id', aal.resource_id,
        'action', aal.action
      ) as metadata,
      aal.created_at,
      NULL::uuid as portfolio_id,
      NULL::text as portfolio_name,
      aal.ip_address,
      NULL::text as user_agent
    FROM admin_action_logs aal
    LEFT JOIN profiles p ON p.id = aal.admin_user_id
    WHERE aal.created_at BETWEEN v_start_date AND v_end_date
  ),
  security_logs AS (
    SELECT 
      sal.id,
      sal.user_id,
      COALESCE(
        p.first_name || ' ' || p.last_name,
        p.first_name,
        'Unknown User'
      ) as user_name,
      COALESCE(p.user_type, 'tenant'::user_type) as user_type,
      sal.event_type as activity_type,
      'security' as activity_category,
      sal.event_type || ' - ' || sal.resource_type as description,
      sal.metadata,
      sal.created_at,
      NULL::uuid as portfolio_id,
      NULL::text as portfolio_name,
      sal.ip_address,
      sal.user_agent
    FROM security_audit_logs sal
    LEFT JOIN profiles p ON p.id = sal.user_id
    WHERE sal.created_at BETWEEN v_start_date AND v_end_date
  ),
  account_logs AS (
    SELECT 
      aal.id,
      aal.user_id,
      COALESCE(
        p.first_name || ' ' || p.last_name,
        p.first_name,
        'Unknown User'
      ) as user_name,
      COALESCE(p.user_type, 'tenant'::user_type) as user_type,
      aal.event_type as activity_type,
      'account' as activity_category,
      aal.event_type as description,
      aal.metadata,
      aal.created_at,
      NULL::uuid as portfolio_id,
      NULL::text as portfolio_name,
      aal.ip_address,
      aal.user_agent
    FROM account_activity_log aal
    LEFT JOIN profiles p ON p.id = aal.user_id
    WHERE aal.created_at BETWEEN v_start_date AND v_end_date
  ),
  unified AS (
    SELECT * FROM rbac_logs
    UNION ALL
    SELECT * FROM admin_logs
    UNION ALL
    SELECT * FROM security_logs
    UNION ALL
    SELECT * FROM account_logs
  )
  SELECT 
    u.id,
    u.user_id,
    u.user_name,
    u.user_type,
    u.activity_type,
    u.activity_category,
    u.description,
    u.metadata,
    u.created_at,
    u.portfolio_id,
    u.portfolio_name,
    u.ip_address,
    u.user_agent
  FROM unified u
  WHERE 
    (p_activity_type IS NULL OR u.activity_category = p_activity_type)
    AND (p_user_id IS NULL OR u.user_id = p_user_id)
    AND (p_portfolio_id IS NULL OR u.portfolio_id = p_portfolio_id)
    AND (
      p_search_query IS NULL 
      OR u.user_name ILIKE '%' || p_search_query || '%'
      OR u.description ILIKE '%' || p_search_query || '%'
      OR u.activity_type ILIKE '%' || p_search_query || '%'
    )
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;