-- Fix log_security_audit function overload issue by creating a wrapper
CREATE OR REPLACE FUNCTION public.log_security_audit_event(
  p_event_type text,
  p_user_id uuid DEFAULT NULL,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_severity text DEFAULT 'medium'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO security_audit_log (
    event_type,
    user_id,
    resource_type,
    resource_id,
    action,
    ip_address,
    user_agent,
    metadata,
    severity,
    created_at
  ) VALUES (
    p_event_type,
    p_user_id,
    p_resource_type,
    p_resource_id,
    p_action,
    p_ip_address::inet,
    p_user_agent,
    COALESCE(p_metadata, '{}'::jsonb),
    p_severity,
    NOW()
  );
END;
$$;

-- Fix points system admin functions with proper type casting
DROP FUNCTION IF EXISTS public.get_points_system_overview_admin();
CREATE OR REPLACE FUNCTION public.get_points_system_overview_admin()
RETURNS TABLE(
  total_points_distributed bigint,
  active_users bigint,
  monthly_growth numeric,
  total_value numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH current_stats AS (
    SELECT 
      COALESCE(SUM(CASE WHEN points_change > 0 THEN points_change ELSE 0 END), 0) as distributed_points,
      COUNT(DISTINCT user_id) as unique_users
    FROM points_history
    WHERE created_at >= date_trunc('month', CURRENT_DATE)
  ),
  previous_stats AS (
    SELECT 
      COUNT(DISTINCT user_id) as prev_unique_users
    FROM points_history
    WHERE created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
    AND created_at < date_trunc('month', CURRENT_DATE)
  ),
  total_stats AS (
    SELECT 
      COALESCE(SUM(CASE WHEN points_change > 0 THEN points_change ELSE 0 END), 0) as all_distributed_points
    FROM points_history
  )
  SELECT 
    cs.distributed_points::bigint as total_points_distributed,
    cs.unique_users::bigint as active_users,
    CASE 
      WHEN ps.prev_unique_users > 0 THEN 
        ((cs.unique_users::numeric - ps.prev_unique_users::numeric) / ps.prev_unique_users::numeric * 100)
      ELSE 0
    END as monthly_growth,
    (ts.all_distributed_points::numeric * 0.01) as total_value -- Assuming 1 point = $0.01
  FROM current_stats cs
  CROSS JOIN previous_stats ps  
  CROSS JOIN total_stats ts;
END;
$$;

-- Fix points monthly trends function
DROP FUNCTION IF EXISTS public.get_points_monthly_trends_admin(integer);
CREATE OR REPLACE FUNCTION public.get_points_monthly_trends_admin(months integer DEFAULT 12)
RETURNS TABLE(
  month_start date,
  points_awarded bigint,
  unique_users bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH monthly_series AS (
    SELECT generate_series(
      date_trunc('month', CURRENT_DATE - (months || ' months')::interval),
      date_trunc('month', CURRENT_DATE),
      '1 month'::interval
    )::date as month_start
  )
  SELECT 
    ms.month_start,
    COALESCE(SUM(CASE WHEN ph.points_change > 0 THEN ph.points_change ELSE 0 END), 0)::bigint as points_awarded,
    COUNT(DISTINCT ph.user_id)::bigint as unique_users
  FROM monthly_series ms
  LEFT JOIN points_history ph ON (
    date_trunc('month', ph.created_at) = ms.month_start
  )
  GROUP BY ms.month_start
  ORDER BY ms.month_start;
END;
$$;

-- Fix points recent activity function
DROP FUNCTION IF EXISTS public.get_points_recent_activity_admin(integer);
CREATE OR REPLACE FUNCTION public.get_points_recent_activity_admin(limit_count integer DEFAULT 20)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  action text,
  points integer,
  processed_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ph.user_id,
    COALESCE(pr.first_name || ' ' || pr.last_name, 'Unknown User') as user_name,
    ph.event_type as action,
    ph.points_change as points,
    ph.created_at as processed_at
  FROM points_history ph
  LEFT JOIN profiles pr ON ph.user_id = pr.id
  ORDER BY ph.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Fix points leaderboard function
DROP FUNCTION IF EXISTS public.get_points_leaderboard_admin(text, integer);
CREATE OR REPLACE FUNCTION public.get_points_leaderboard_admin(
  period text DEFAULT '30d',
  limit_count integer DEFAULT 10
)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  total_points bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  start_date timestamp with time zone;
BEGIN
  -- Calculate start date based on period
  CASE period
    WHEN '7d' THEN start_date := CURRENT_DATE - INTERVAL '7 days';
    WHEN '30d' THEN start_date := CURRENT_DATE - INTERVAL '30 days';
    WHEN '90d' THEN start_date := CURRENT_DATE - INTERVAL '90 days';
    WHEN '1y' THEN start_date := CURRENT_DATE - INTERVAL '1 year';
    ELSE start_date := CURRENT_DATE - INTERVAL '30 days';
  END CASE;

  RETURN QUERY
  SELECT 
    ph.user_id,
    COALESCE(pr.first_name || ' ' || pr.last_name, 'Unknown User') as user_name,
    COALESCE(SUM(ph.points_change), 0)::bigint as total_points
  FROM points_history ph
  LEFT JOIN profiles pr ON ph.user_id = pr.id
  WHERE ph.created_at >= start_date
  GROUP BY ph.user_id, pr.first_name, pr.last_name
  HAVING SUM(ph.points_change) > 0
  ORDER BY total_points DESC
  LIMIT limit_count;
END;
$$;