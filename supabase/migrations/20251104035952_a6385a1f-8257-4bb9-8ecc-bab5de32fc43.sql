-- Fix get_unified_activity_feed function to use valid user_type enum values
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
      rl.id,
      rl.user_id,
      COALESCE(
        p.first_name || ' ' || p.last_name,
        p.first_name,
        'Unknown User'
      ) as user_name,
      COALESCE(p.user_type, 'tenant'::user_type) as user_type,
      'rbac_action' as activity_type,
      rl.scope as activity_category,
      rl.object || ' - ' || rl.action as description,
      jsonb_build_object(
        'scope', rl.scope,
        'object', rl.object,
        'action', rl.action,
        'allowed', rl.allowed,
        'source', rl.source,
        'route', rl.route
      ) as metadata,
      rl.created_at,
      rl.portfolio_id,
      po.name as portfolio_name,
      rl.ip_address,
      rl.user_agent
    FROM rbac_logs rl
    LEFT JOIN profiles p ON p.user_id = rl.user_id
    LEFT JOIN portfolios po ON po.id = rl.portfolio_id
    WHERE rl.created_at BETWEEN v_start_date AND v_end_date
  ),
  account_logs AS (
    SELECT 
      al.id,
      al.user_id,
      COALESCE(
        p.first_name || ' ' || p.last_name,
        p.first_name,
        'Unknown User'
      ) as user_name,
      COALESCE(p.user_type, 'tenant'::user_type) as user_type,
      al.event_type as activity_type,
      'account' as activity_category,
      al.event_type as description,
      al.metadata,
      al.created_at,
      NULL::uuid as portfolio_id,
      NULL::text as portfolio_name,
      al.ip_address,
      al.user_agent
    FROM account_logs al
    LEFT JOIN profiles p ON p.user_id = al.user_id
    WHERE al.created_at BETWEEN v_start_date AND v_end_date
  ),
  admin_logs AS (
    SELECT 
      adl.id,
      adl.admin_user_id as user_id,
      COALESCE(
        p.first_name || ' ' || p.last_name,
        p.first_name,
        'Unknown Admin'
      ) as user_name,
      COALESCE(p.user_type, 'admin'::user_type) as user_type,
      adl.action as activity_type,
      'admin' as activity_category,
      adl.action || ' on ' || adl.resource_type as description,
      jsonb_build_object(
        'resource_type', adl.resource_type,
        'resource_id', adl.resource_id,
        'action', adl.action
      ) as metadata,
      adl.created_at,
      NULL::uuid as portfolio_id,
      NULL::text as portfolio_name,
      adl.ip_address,
      NULL::text as user_agent
    FROM admin_logs adl
    LEFT JOIN profiles p ON p.user_id = adl.admin_user_id
    WHERE adl.created_at BETWEEN v_start_date AND v_end_date
  ),
  unified AS (
    SELECT * FROM rbac_logs
    UNION ALL
    SELECT * FROM account_logs
    UNION ALL
    SELECT * FROM admin_logs
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