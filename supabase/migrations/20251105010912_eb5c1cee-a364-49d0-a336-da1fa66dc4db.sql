-- Fix get_all_users_with_roles function - add missing column alias
CREATE OR REPLACE FUNCTION public.get_all_users_with_roles()
RETURNS TABLE(
  user_id uuid,
  user_name text,
  user_email text,
  user_type text,
  account_roles text[],
  portfolio_count bigint,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as user_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown') as user_name,
    au.email as user_email,
    p.user_type::text as user_type,
    COALESCE(
      array_agg(ar.role_name::text) FILTER (WHERE ar.role_name IS NOT NULL AND ar.is_active = true),
      '{}'::text[]
    ) as account_roles,
    COALESCE(portfolio_role_count.count, 0) as portfolio_count,
    p.created_at,
    au.last_sign_in_at
  FROM public.profiles p
  JOIN auth.users au ON p.id = au.id
  LEFT JOIN public.account_roles ar ON p.id = ar.user_id AND ar.is_active = true
  LEFT JOIN (
    SELECT pr.user_id, COUNT(DISTINCT pr.portfolio_id) as count
    FROM public.portfolio_roles pr
    WHERE pr.is_active = true
    GROUP BY pr.user_id
  ) portfolio_role_count ON p.id = portfolio_role_count.user_id
  GROUP BY p.id, p.first_name, p.last_name, p.user_type, p.created_at, au.email, au.last_sign_in_at, portfolio_role_count.count
  ORDER BY p.created_at DESC;
END;
$$;