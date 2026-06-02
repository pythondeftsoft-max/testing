-- Add points_balance_after to get_points_recent_activity_admin function
DROP FUNCTION IF EXISTS get_points_recent_activity_admin(integer);

CREATE OR REPLACE FUNCTION get_points_recent_activity_admin(activity_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_name text,
  user_email text,
  event_type text,
  points_change numeric,
  points_balance_after numeric,
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
    au.email::text as user_email,
    ph.event_type,
    ph.points_change,
    ph.points_balance_after,
    COALESCE(ph.notes, '') as notes,
    ph.timestamp as created_at
  FROM points_history ph
  LEFT JOIN profiles p ON ph.user_id = p.id
  LEFT JOIN auth.users au ON ph.user_id = au.id
  ORDER BY ph.timestamp DESC
  LIMIT activity_limit;
END;
$$;