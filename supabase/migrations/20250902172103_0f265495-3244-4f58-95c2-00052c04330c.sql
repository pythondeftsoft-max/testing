-- Drop the conflicting log_security_audit function with jsonb parameter
DROP FUNCTION IF EXISTS public.log_security_audit(text, uuid, text, text, text, jsonb, text, text);

-- Update points system overview to use points_history
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
DECLARE
  current_month_start date := date_trunc('month', CURRENT_DATE)::date;
  last_month_start date := (date_trunc('month', CURRENT_DATE) - interval '1 month')::date;
  last_month_end date := (date_trunc('month', CURRENT_DATE) - interval '1 day')::date;
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COALESCE(SUM(CASE WHEN points_change > 0 THEN points_change ELSE 0 END), 0) as total_distributed,
      COUNT(DISTINCT user_id) as unique_users,
      COALESCE(SUM(CASE 
        WHEN points_change > 0 AND timestamp >= current_month_start THEN points_change 
        ELSE 0 
      END), 0) as current_month_points,
      COALESCE(SUM(CASE 
        WHEN points_change > 0 AND timestamp >= last_month_start AND timestamp <= last_month_end THEN points_change 
        ELSE 0 
      END), 0) as last_month_points
    FROM points_history
    WHERE timestamp >= CURRENT_DATE - interval '12 months'
  )
  SELECT 
    s.total_distributed,
    s.unique_users,
    CASE 
      WHEN s.last_month_points > 0 THEN ((s.current_month_points - s.last_month_points) / s.last_month_points * 100)
      ELSE 0 
    END as monthly_growth,
    (s.total_distributed / 100.0) as total_value -- Assuming 100 points = $1
  FROM stats s;
END;
$$;

-- Update points monthly trends to use points_history
CREATE OR REPLACE FUNCTION public.get_points_monthly_trends_admin(months integer DEFAULT 12)
RETURNS TABLE(
  month_start text,
  points_awarded bigint,
  unique_users bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(date_trunc('month', ph.timestamp), 'YYYY-MM-DD') as month_start,
    COALESCE(SUM(CASE WHEN ph.points_change > 0 THEN ph.points_change ELSE 0 END), 0) as points_awarded,
    COUNT(DISTINCT ph.user_id) as unique_users
  FROM points_history ph
  WHERE ph.timestamp >= CURRENT_DATE - (months || ' months')::interval
  GROUP BY date_trunc('month', ph.timestamp)
  ORDER BY date_trunc('month', ph.timestamp) DESC;
END;
$$;

-- Update points recent activity to use points_history
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
    COALESCE(CONCAT(p.first_name, ' ', p.last_name), 'Unknown User') as user_name,
    ph.event_type as action,
    ph.points_change as points,
    ph.timestamp as processed_at
  FROM points_history ph
  LEFT JOIN profiles p ON ph.user_id = p.id
  WHERE ph.points_change != 0
  ORDER BY ph.timestamp DESC
  LIMIT limit_count;
END;
$$;

-- Update points leaderboard to use points_history
CREATE OR REPLACE FUNCTION public.get_points_leaderboard_admin(period text DEFAULT '30d', limit_count integer DEFAULT 10)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  total_points bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  period_start timestamp with time zone;
BEGIN
  -- Calculate period start based on input
  CASE period
    WHEN '7d' THEN period_start := CURRENT_TIMESTAMP - interval '7 days';
    WHEN '30d' THEN period_start := CURRENT_TIMESTAMP - interval '30 days';
    WHEN '90d' THEN period_start := CURRENT_TIMESTAMP - interval '90 days';
    WHEN '1y' THEN period_start := CURRENT_TIMESTAMP - interval '1 year';
    ELSE period_start := CURRENT_TIMESTAMP - interval '30 days';
  END CASE;

  RETURN QUERY
  SELECT 
    ph.user_id,
    COALESCE(CONCAT(p.first_name, ' ', p.last_name), 'Unknown User') as user_name,
    COALESCE(SUM(CASE WHEN ph.points_change > 0 THEN ph.points_change ELSE 0 END), 0) as total_points
  FROM points_history ph
  LEFT JOIN profiles p ON ph.user_id = p.id
  WHERE ph.timestamp >= period_start
  GROUP BY ph.user_id, p.first_name, p.last_name
  HAVING SUM(CASE WHEN ph.points_change > 0 THEN ph.points_change ELSE 0 END) > 0
  ORDER BY total_points DESC
  LIMIT limit_count;
END;
$$;

-- Insert sample data into points_history for testing
INSERT INTO points_history (user_id, event_type, points_change, points_balance_after, timestamp, notes)
SELECT 
  p.id,
  (ARRAY['property_listing', 'tenant_approval', 'rent_collection', 'maintenance_completion', 'referral_bonus'])[floor(random() * 5) + 1],
  floor(random() * 200 + 50)::integer,
  floor(random() * 1000 + 100)::integer,
  CURRENT_TIMESTAMP - (random() * interval '90 days'),
  'Sample activity for testing'
FROM profiles p 
WHERE p.user_type IN ('landlord', 'tenant')
LIMIT 50
ON CONFLICT DO NOTHING;

-- Add unique constraint to user_sessions to fix upsert issues
ALTER TABLE user_sessions 
ADD CONSTRAINT user_sessions_user_token_unique 
UNIQUE (user_id, session_token);