-- Add net_points_balance to get_points_system_overview_admin
DROP FUNCTION IF EXISTS get_points_system_overview_admin();

CREATE OR REPLACE FUNCTION get_points_system_overview_admin()
RETURNS TABLE (
  total_points_distributed numeric,
  active_users bigint,
  monthly_growth numeric,
  total_value numeric,
  net_points_balance numeric
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
    ROUND(COALESCE(SUM(CASE WHEN points_change > 0 THEN points_change ELSE 0 END), 0)::numeric / points_to_dollar_ratio, 2) as total_value,
    COALESCE(SUM(points_change), 0)::numeric as net_points_balance
  FROM points_history;
END;
$$;