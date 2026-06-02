-- Drop and recreate search_admin_users function to include phone number
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
    p.user_type,
    p.account_status,
    p.created_at,
    p.last_sign_in_at,
    COALESCE(SUM(pup.points), 0)::BIGINT as total_points,
    ls.status as subscription_status,
    ls.plan_name as subscription_plan,
    ls.subscription_role as subscription_role
  FROM profiles p
  LEFT JOIN portfolio_user_points pup ON p.id = pup.user_id
  LEFT JOIN landlord_subscriptions ls ON p.id = ls.landlord_id AND ls.status = 'active'
  WHERE 
    (search_query = '' OR 
     p.first_name ILIKE '%' || search_query || '%' OR 
     p.last_name ILIKE '%' || search_query || '%' OR 
     p.email ILIKE '%' || search_query || '%')
    AND (type_filter IS NULL OR p.user_type = type_filter)
    AND (status_filter IS NULL OR p.account_status = status_filter)
  GROUP BY p.id, p.first_name, p.last_name, p.email, p.phone, p.user_type, 
           p.account_status, p.created_at, p.last_sign_in_at,
           ls.status, ls.plan_name, ls.subscription_role
  ORDER BY p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;