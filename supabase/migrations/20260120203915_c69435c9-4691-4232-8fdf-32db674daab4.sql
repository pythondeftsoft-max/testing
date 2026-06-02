-- Fix search_admin_users to cast text parameter to user_type enum
DROP FUNCTION IF EXISTS public.search_admin_users(TEXT, TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.search_admin_users(
  search_query TEXT DEFAULT '',
  type_filter TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  user_type TEXT,
  account_status TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  total_points BIGINT,
  subscription_status TEXT,
  subscription_plan TEXT,
  subscription_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.user_type::TEXT,
    p.status as account_status,
    p.created_at,
    au.last_sign_in_at,
    COALESCE(SUM(pup.points_awarded), 0)::BIGINT as total_points,
    s.status as subscription_status,
    s.plan_type as subscription_plan,
    s.role as subscription_role
  FROM profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  LEFT JOIN portfolio_user_points pup ON p.id = pup.user_id
  LEFT JOIN subscriptions s ON p.id = s.user_id AND s.status = 'active'
  WHERE 
    (search_query = '' OR 
     p.first_name ILIKE '%' || search_query || '%' OR 
     p.last_name ILIKE '%' || search_query || '%' OR 
     p.email ILIKE '%' || search_query || '%')
    AND (type_filter IS NULL OR p.user_type = type_filter::user_type)
    AND (status_filter IS NULL OR p.status = status_filter)
  GROUP BY p.id, p.first_name, p.last_name, p.email, p.phone, p.user_type, 
           p.status, p.created_at, au.last_sign_in_at,
           s.status, s.plan_type, s.role
  ORDER BY p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;