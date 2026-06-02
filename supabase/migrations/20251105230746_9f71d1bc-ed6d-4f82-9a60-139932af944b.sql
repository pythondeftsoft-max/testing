-- Fix get_points_recent_activity_admin to use correct profile columns
DROP FUNCTION IF EXISTS get_points_recent_activity_admin(integer);

CREATE OR REPLACE FUNCTION get_points_recent_activity_admin(activity_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_name text,
  user_email text,
  event_type text,
  points_change integer,
  notes text,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ph.id,
    ph.user_id,
    COALESCE(CONCAT(p.first_name, ' ', p.last_name), au.email) as user_name,
    au.email as user_email,
    ph.event_type,
    ph.points_change,
    COALESCE(ph.notes, '') as notes,
    ph.timestamp as created_at
  FROM points_history ph
  LEFT JOIN profiles p ON ph.user_id = p.id
  LEFT JOIN auth.users au ON ph.user_id = au.id
  ORDER BY ph.timestamp DESC
  LIMIT activity_limit;
END;
$$;

-- Fix get_points_system_overview_admin with correct return types
DROP FUNCTION IF EXISTS get_points_system_overview_admin();

CREATE OR REPLACE FUNCTION get_points_system_overview_admin()
RETURNS TABLE (
  total_points_distributed numeric,
  active_users bigint,
  monthly_growth numeric,
  total_value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  points_to_dollar_ratio numeric;
  current_month_points numeric;
  last_month_points numeric;
BEGIN
  -- Get the points to dollar ratio from system_config
  SELECT COALESCE((config_value->>'points_to_dollar_ratio')::numeric, 100) 
  INTO points_to_dollar_ratio
  FROM system_config 
  WHERE config_key = 'points_system';

  -- Get current month points
  SELECT COALESCE(SUM(points_change), 0)::numeric
  INTO current_month_points
  FROM points_history
  WHERE points_change > 0
    AND timestamp >= date_trunc('month', CURRENT_DATE);

  -- Get last month points
  SELECT COALESCE(SUM(points_change), 0)::numeric
  INTO last_month_points
  FROM points_history
  WHERE points_change > 0
    AND timestamp >= date_trunc('month', CURRENT_DATE - interval '1 month')
    AND timestamp < date_trunc('month', CURRENT_DATE);

  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN points_change > 0 THEN points_change ELSE 0 END), 0)::numeric as total_points_distributed,
    COUNT(DISTINCT user_id) as active_users,
    CASE 
      WHEN last_month_points > 0 THEN 
        ROUND(((current_month_points - last_month_points) / last_month_points * 100), 2)
      ELSE NULL
    END as monthly_growth,
    ROUND(COALESCE(SUM(CASE WHEN points_change > 0 THEN points_change ELSE 0 END), 0)::numeric / points_to_dollar_ratio, 2) as total_value
  FROM points_history;
END;
$$;

-- Fix get_points_monthly_trends_admin
DROP FUNCTION IF EXISTS get_points_monthly_trends_admin(integer);

CREATE OR REPLACE FUNCTION get_points_monthly_trends_admin(months integer DEFAULT 12)
RETURNS TABLE (
  month_start date,
  points_awarded bigint,
  unique_users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('month', ph.timestamp)::date as month_start,
    COALESCE(SUM(CASE WHEN ph.points_change > 0 THEN ph.points_change ELSE 0 END), 0) as points_awarded,
    COUNT(DISTINCT ph.user_id) as unique_users
  FROM points_history ph
  WHERE ph.timestamp >= CURRENT_DATE - (months || ' months')::interval
  GROUP BY date_trunc('month', ph.timestamp)
  ORDER BY month_start DESC;
END;
$$;

-- Fix get_points_leaderboard_admin to use correct profile columns
DROP FUNCTION IF EXISTS get_points_leaderboard_admin(text, integer);

CREATE OR REPLACE FUNCTION get_points_leaderboard_admin(
  period text DEFAULT '30d',
  limit_count integer DEFAULT 10
)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  total_points bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date timestamptz;
BEGIN
  -- Determine the start date based on the period
  CASE period
    WHEN '7d' THEN start_date := CURRENT_DATE - interval '7 days';
    WHEN '30d' THEN start_date := CURRENT_DATE - interval '30 days';
    WHEN '90d' THEN start_date := CURRENT_DATE - interval '90 days';
    WHEN 'all' THEN start_date := '1970-01-01'::timestamptz;
    ELSE start_date := CURRENT_DATE - interval '30 days';
  END CASE;

  RETURN QUERY
  SELECT 
    ph.user_id,
    COALESCE(CONCAT(p.first_name, ' ', p.last_name), au.email) as user_name,
    SUM(ph.points_change) as total_points
  FROM points_history ph
  LEFT JOIN profiles p ON ph.user_id = p.id
  LEFT JOIN auth.users au ON ph.user_id = au.id
  WHERE ph.timestamp >= start_date
  GROUP BY ph.user_id, p.first_name, p.last_name, au.email
  ORDER BY total_points DESC
  LIMIT limit_count;
END;
$$;