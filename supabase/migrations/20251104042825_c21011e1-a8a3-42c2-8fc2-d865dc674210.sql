-- Fix portfolio column name from po.name to po.client_name
DROP FUNCTION IF EXISTS get_unified_activity_feed(
  uuid, text, text, text, text, text, integer, integer
);

CREATE OR REPLACE FUNCTION get_unified_activity_feed(
  p_user_id uuid,
  p_search text DEFAULT NULL,
  p_activity_type text DEFAULT NULL,
  p_time_range text DEFAULT NULL,
  p_user_type text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  log_id text,
  user_id uuid,
  user_name text,
  user_email text,
  activity_type text,
  action text,
  description text,
  status text,
  risk_level text,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz,
  property_address text,
  property_id uuid,
  portfolio_name text,
  portfolio_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date timestamptz;
  v_end_date timestamptz;
BEGIN
  -- Calculate date range
  v_end_date := now();
  CASE p_time_range
    WHEN 'today' THEN v_start_date := date_trunc('day', now());
    WHEN 'yesterday' THEN 
      v_start_date := date_trunc('day', now() - interval '1 day');
      v_end_date := date_trunc('day', now());
    WHEN 'week' THEN v_start_date := now() - interval '7 days';
    WHEN 'month' THEN v_start_date := now() - interval '30 days';
    WHEN 'quarter' THEN v_start_date := now() - interval '90 days';
    WHEN 'year' THEN v_start_date := now() - interval '1 year';
    ELSE v_start_date := NULL;
  END CASE;

  RETURN QUERY
  -- RBAC Event Logs
  SELECT 
    r.id::text as log_id,
    r.user_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown User') as user_name,
    COALESCE(p.email, 'unknown@example.com') as user_email,
    'access_control' as activity_type,
    r.action,
    COALESCE(r.resource_type || ': ' || r.action, 'Access Control Event') as description,
    CASE WHEN r.allowed THEN 'success' ELSE 'failed' END as status,
    'low' as risk_level,
    r.ip_address,
    r.user_agent,
    r.metadata,
    r.created_at,
    pr.address as property_address,
    pr.id as property_id,
    po.client_name as portfolio_name,
    po.id as portfolio_id
  FROM rbac_event_logs r
  LEFT JOIN profiles p ON r.user_id = p.id
  LEFT JOIN properties pr ON (r.metadata->>'property_id')::uuid = pr.id
  LEFT JOIN portfolios po ON pr.portfolio_id = po.id
  WHERE (p_search IS NULL OR 
         p.first_name ILIKE '%' || p_search || '%' OR 
         p.last_name ILIKE '%' || p_search || '%' OR
         p.email ILIKE '%' || p_search || '%' OR
         r.action ILIKE '%' || p_search || '%')
    AND (p_activity_type IS NULL OR p_activity_type = 'access_control')
    AND (v_start_date IS NULL OR r.created_at >= v_start_date)
    AND (r.created_at <= v_end_date)
    AND (p_status IS NULL OR 
         (p_status = 'success' AND r.allowed = true) OR
         (p_status = 'failed' AND r.allowed = false))

  UNION ALL

  -- Admin Activity Logs
  SELECT 
    a.id::text as log_id,
    a.user_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown User') as user_name,
    COALESCE(p.email, 'unknown@example.com') as user_email,
    'admin' as activity_type,
    a.action,
    COALESCE(a.entity_type || ': ' || a.action, 'Admin Action') as description,
    'success' as status,
    'medium' as risk_level,
    a.ip_address,
    a.user_agent,
    a.details as metadata,
    a.created_at,
    pr.address as property_address,
    pr.id as property_id,
    po.client_name as portfolio_name,
    po.id as portfolio_id
  FROM admin_activity_logs a
  LEFT JOIN profiles p ON a.user_id = p.id
  LEFT JOIN properties pr ON (a.details->>'property_id')::uuid = pr.id
  LEFT JOIN portfolios po ON pr.portfolio_id = po.id
  WHERE (p_search IS NULL OR 
         p.first_name ILIKE '%' || p_search || '%' OR 
         p.last_name ILIKE '%' || p_search || '%' OR
         p.email ILIKE '%' || p_search || '%' OR
         a.action ILIKE '%' || p_search || '%')
    AND (p_activity_type IS NULL OR p_activity_type = 'admin')
    AND (v_start_date IS NULL OR a.created_at >= v_start_date)
    AND (a.created_at <= v_end_date)

  UNION ALL

  -- Security Events
  SELECT 
    s.id::text as log_id,
    s.user_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown User') as user_name,
    COALESCE(p.email, 'unknown@example.com') as user_email,
    'security' as activity_type,
    s.event_type as action,
    s.event_type || ' detected' as description,
    CASE WHEN s.blocked THEN 'blocked' ELSE 'detected' END as status,
    s.severity as risk_level,
    s.ip_address,
    s.user_agent,
    s.metadata,
    s.created_at,
    NULL as property_address,
    NULL as property_id,
    NULL as portfolio_name,
    NULL as portfolio_id
  FROM security_events s
  LEFT JOIN profiles p ON s.user_id = p.id
  WHERE (p_search IS NULL OR 
         p.first_name ILIKE '%' || p_search || '%' OR 
         p.last_name ILIKE '%' || p_search || '%' OR
         p.email ILIKE '%' || p_search || '%' OR
         s.event_type ILIKE '%' || p_search || '%')
    AND (p_activity_type IS NULL OR p_activity_type = 'security')
    AND (v_start_date IS NULL OR s.created_at >= v_start_date)
    AND (s.created_at <= v_end_date)
    AND (p_status IS NULL OR 
         (p_status = 'blocked' AND s.blocked = true) OR
         (p_status = 'detected' AND s.blocked = false))

  UNION ALL

  -- Account Activity Logs
  SELECT 
    al.id::text as log_id,
    al.user_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown User') as user_name,
    COALESCE(p.email, 'unknown@example.com') as user_email,
    'account' as activity_type,
    al.action,
    al.description,
    'success' as status,
    'low' as risk_level,
    al.ip_address,
    al.user_agent,
    al.metadata,
    al.created_at,
    NULL as property_address,
    NULL as property_id,
    NULL as portfolio_name,
    NULL as portfolio_id
  FROM account_activity_log al
  LEFT JOIN profiles p ON al.user_id = p.id
  WHERE (p_search IS NULL OR 
         p.first_name ILIKE '%' || p_search || '%' OR 
         p.last_name ILIKE '%' || p_search || '%' OR
         p.email ILIKE '%' || p_search || '%' OR
         al.action ILIKE '%' || p_search || '%' OR
         al.description ILIKE '%' || p_search || '%')
    AND (p_activity_type IS NULL OR p_activity_type = 'account')
    AND (v_start_date IS NULL OR al.created_at >= v_start_date)
    AND (al.created_at <= v_end_date)

  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;