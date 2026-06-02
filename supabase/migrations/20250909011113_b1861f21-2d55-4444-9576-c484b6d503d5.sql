-- Create the missing get_user_points_summary RPC function
CREATE OR REPLACE FUNCTION public.get_user_points_summary(p_user_id uuid, p_portfolio_id uuid DEFAULT NULL)
RETURNS TABLE(
  total_points integer,
  points_this_month integer,
  points_last_month integer,
  portfolio_count integer,
  recent_activity_count integer,
  spendable_points integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_current_month_start date;
  v_last_month_start date;
  v_last_month_end date;
  v_week_ago timestamp;
BEGIN
  -- Calculate date ranges
  v_current_month_start := date_trunc('month', CURRENT_DATE)::date;
  v_last_month_start := (date_trunc('month', CURRENT_DATE) - interval '1 month')::date;
  v_last_month_end := (v_current_month_start - interval '1 day')::date;
  v_week_ago := CURRENT_TIMESTAMP - interval '7 days';
  
  RETURN QUERY
  WITH user_points_data AS (
    SELECT 
      pup.points_awarded,
      pup.created_at,
      pup.processed_at,
      pup.portfolio_id
    FROM portfolio_user_points pup
    WHERE pup.user_id = p_user_id
    AND (p_portfolio_id IS NULL OR pup.portfolio_id = p_portfolio_id)
  ),
  point_totals AS (
    SELECT 
      COALESCE(SUM(points_awarded), 0)::integer as total_pts,
      COALESCE(SUM(
        CASE WHEN COALESCE(processed_at, created_at)::date >= v_current_month_start 
        THEN points_awarded ELSE 0 END
      ), 0)::integer as this_month_pts,
      COALESCE(SUM(
        CASE WHEN COALESCE(processed_at, created_at)::date BETWEEN v_last_month_start AND v_last_month_end
        THEN points_awarded ELSE 0 END
      ), 0)::integer as last_month_pts,
      COUNT(CASE WHEN COALESCE(processed_at, created_at) >= v_week_ago THEN 1 END)::integer as recent_count,
      COUNT(DISTINCT portfolio_id)::integer as portfolio_cnt
    FROM user_points_data
  ),
  conversion_totals AS (
    SELECT COALESCE(SUM(points_amount), 0)::integer as converted_points
    FROM point_conversions pc
    WHERE pc.user_id = p_user_id
    AND pc.status = 'completed'
    AND (p_portfolio_id IS NULL OR pc.metadata->>'portfolio_id' = p_portfolio_id::text)
  )
  SELECT 
    pt.total_pts,
    pt.this_month_pts,
    pt.last_month_pts,
    pt.portfolio_cnt,
    pt.recent_count,
    GREATEST(0, pt.total_pts - ct.converted_points)::integer as spendable_pts
  FROM point_totals pt
  CROSS JOIN conversion_totals ct;
END;
$function$