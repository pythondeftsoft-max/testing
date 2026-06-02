-- Fix type mismatch in get_points_recent_activity_admin by casting email to text
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
    au.email::text as user_email,
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