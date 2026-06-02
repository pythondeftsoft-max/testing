-- Update RLS policy for get_rbac_stats to require admin access
DROP POLICY IF EXISTS "Allow access to rbac stats" ON rbac_audit_logs;

-- Create hardened get_rbac_stats function with admin access requirement
CREATE OR REPLACE FUNCTION public.get_rbac_stats(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_scope TEXT DEFAULT NULL
)
RETURNS TABLE(
  date DATE,
  total_events BIGINT,
  allowed_events BIGINT,
  denied_events BIGINT,
  unique_users BIGINT,
  top_objects JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has admin role or is account owner
  IF NOT (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]) OR is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied. Only admins and account owners can view RBAC statistics.';
  END IF;

  -- Set default dates if not provided
  IF p_start_date IS NULL THEN
    p_start_date := CURRENT_DATE - INTERVAL '7 days';
  END IF;
  IF p_end_date IS NULL THEN
    p_end_date := CURRENT_DATE;
  END IF;

  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      DATE(created_at) as log_date,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE allowed = true) as allowed,
      COUNT(*) FILTER (WHERE allowed = false) as denied,
      COUNT(DISTINCT user_id) as users,
      JSONB_AGG(
        JSONB_BUILD_OBJECT('object', object, 'count', 1)
      ) as objects
    FROM rbac_audit_logs
    WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date
      AND (p_scope IS NULL OR scope = p_scope)
    GROUP BY DATE(created_at)
  ),
  top_objects_agg AS (
    SELECT 
      log_date,
      JSONB_AGG(
        obj ORDER BY (obj->>'count')::int DESC
      ) FILTER (WHERE row_number() OVER (PARTITION BY log_date ORDER BY (obj->>'count')::int DESC) <= 5) as top_5
    FROM daily_stats,
    LATERAL JSONB_ARRAY_ELEMENTS(objects) as obj
    GROUP BY log_date
  )
  SELECT 
    ds.log_date,
    ds.total,
    ds.allowed,
    ds.denied,
    ds.users,
    COALESCE(toa.top_5, '[]'::jsonb)
  FROM daily_stats ds
  LEFT JOIN top_objects_agg toa ON ds.log_date = toa.log_date
  ORDER BY ds.log_date;
END;
$$;