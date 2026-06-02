-- Drop and recreate search_admin_users function
DROP FUNCTION IF EXISTS public.search_admin_users(text, text, text, integer, integer);

CREATE FUNCTION public.search_admin_users(
  search_query text DEFAULT NULL,
  type_filter text DEFAULT NULL,
  status_filter text DEFAULT NULL,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  user_type text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  total_points integer,
  account_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH base AS (
    SELECT 
      p.id,
      p.first_name,
      p.last_name,
      p.user_type::text AS user_type,
      p.created_at,
      au.email,
      au.last_sign_in_at,
      CASE 
        WHEN au.email_confirmed_at IS NOT NULL AND (au.banned_until IS NULL OR au.banned_until <= now()) THEN 'active'
        WHEN au.email_confirmed_at IS NULL THEN 'invited'
        ELSE 'suspended'
      END::text AS account_status
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.id
    WHERE (type_filter IS NULL OR p.user_type::text = type_filter)
      AND (
        search_query IS NULL OR search_query = '' OR
        lower(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) LIKE '%' || lower(search_query) || '%' OR
        lower(au.email) LIKE '%' || lower(search_query) || '%'
      )
  ),
  filtered AS (
    SELECT * FROM base
    WHERE (status_filter IS NULL OR account_status = status_filter)
  )
  SELECT
    f.id,
    f.first_name,
    f.last_name,
    f.email,
    f.user_type,
    f.created_at,
    f.last_sign_in_at,
    COALESCE(SUM(ph.points_change), 0)::integer AS total_points,
    f.account_status
  FROM filtered f
  LEFT JOIN public.points_history ph ON ph.user_id = f.id
  GROUP BY f.id, f.first_name, f.last_name, f.email, f.user_type, f.created_at, f.last_sign_in_at, f.account_status
  ORDER BY f.created_at DESC
  LIMIT COALESCE(limit_count, 50)
  OFFSET COALESCE(offset_count, 0);
$$;