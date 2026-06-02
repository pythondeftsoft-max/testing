-- Fix get_all_account_roles_with_emails to show all users for admins
CREATE OR REPLACE FUNCTION public.get_all_account_roles_with_emails()
RETURNS TABLE(
  user_id uuid,
  user_name text,
  user_email text,
  role_name text,
  is_active boolean,
  granted_by uuid,
  granted_at timestamp with time zone,
  notes text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    ar.user_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown') as user_name,
    au.email as user_email,
    ar.role_name::text,
    ar.is_active,
    ar.granted_by,
    ar.granted_at,
    ar.notes
  FROM public.account_roles ar
  JOIN auth.users au ON ar.user_id = au.id
  LEFT JOIN public.profiles p ON ar.user_id = p.id
  ORDER BY ar.granted_at DESC;
END;
$$;

-- Create function to get all users (not just those with roles)
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
  -- Check if current user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as user_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown') as user_name,
    au.email as user_email,
    p.user_type::text,
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
    SELECT user_id, COUNT(DISTINCT portfolio_id) as count
    FROM public.portfolio_roles 
    WHERE is_active = true
    GROUP BY user_id
  ) portfolio_role_count ON p.id = portfolio_role_count.user_id
  GROUP BY p.id, p.first_name, p.last_name, p.user_type, p.created_at, au.email, au.last_sign_in_at, portfolio_role_count.count
  ORDER BY p.created_at DESC;
END;
$$;

-- Ensure log_rbac_event function exists
CREATE OR REPLACE FUNCTION public.log_rbac_event(
  p_actor_user_id uuid,
  p_change_type text,
  p_scope text,
  p_object text DEFAULT NULL,
  p_target_user_id uuid DEFAULT NULL,
  p_portfolio_id uuid DEFAULT NULL,
  p_old_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.rbac_change_logs (
    actor_user_id,
    change_type,
    scope,
    object,
    target_user_id,
    portfolio_id,
    old_value,
    new_value
  ) VALUES (
    p_actor_user_id,
    p_change_type,
    p_scope,
    p_object,
    p_target_user_id,
    p_portfolio_id,
    p_old_value,
    p_new_value
  );
END;
$$;

-- Ensure is_admin function exists and works properly
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  -- Check if user has owner account role or is system admin
  SELECT EXISTS (
    SELECT 1 FROM public.account_roles 
    WHERE account_roles.user_id = $1 
    AND role_name = 'owner' 
    AND is_active = true
  );
$$;