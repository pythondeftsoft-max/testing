-- Drop and recreate the get_all_portfolios_with_roles function with correct column references
DROP FUNCTION IF EXISTS public.get_all_portfolios_with_roles();

CREATE OR REPLACE FUNCTION public.get_all_portfolios_with_roles()
RETURNS TABLE (
  portfolio_id uuid,
  portfolio_name text,
  owner_id uuid,
  owner_name text,
  owner_email text,
  created_at timestamptz,
  property_count integer,
  role_count integer,
  roles jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Admin/Owner guard
  IF NOT (public.is_admin(auth.uid()) 
          OR public.has_account_role(auth.uid(), array['owner'::account_role_type, 'admin_partner'::account_role_type])) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH role_data AS (
    SELECT
      pr.portfolio_id,
      jsonb_agg(
        jsonb_build_object(
          'portfolio_role_id', pr.id,
          'user_id', pr.user_id,
          'user_name', coalesce(pp.first_name || ' ' || pp.last_name, pp.company_name, au.email),
          'user_email', au.email,
          'role_name', pr.role_name,
          'is_active', pr.is_active,
          'added_by', pr.added_by,
          'updated_at', pr.updated_at
        )
        ORDER BY pr.updated_at DESC
      ) FILTER (WHERE pr.id IS NOT NULL) as roles,
      COUNT(*) FILTER (WHERE pr.is_active) as active_role_count
    FROM public.portfolio_roles pr
    LEFT JOIN public.profiles pp ON pp.id = pr.user_id
    LEFT JOIN auth.users au ON au.id = pr.user_id
    GROUP BY pr.portfolio_id
  ),
  property_counts AS (
    SELECT p.portfolio_id, COUNT(*)::int as cnt
    FROM public.properties p
    WHERE p.deleted_at IS NULL AND p.status != 'deleted'
    GROUP BY p.portfolio_id
  )
  SELECT 
    p.id as portfolio_id,
    p.client_name as portfolio_name,
    p.manager_id as owner_id,
    COALESCE(owner.first_name || ' ' || owner.last_name, owner.company_name, owner_user.email) as owner_name,
    owner_user.email as owner_email,
    p.created_at,
    COALESCE(pc.cnt, 0) as property_count,
    COALESCE(rd.active_role_count, 0) as role_count,
    COALESCE(rd.roles, '[]'::jsonb) as roles
  FROM public.portfolios p
  LEFT JOIN public.profiles owner ON owner.id = p.manager_id
  LEFT JOIN auth.users owner_user ON owner_user.id = p.manager_id
  LEFT JOIN property_counts pc ON pc.portfolio_id = p.id
  LEFT JOIN role_data rd ON rd.portfolio_id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_portfolios_with_roles() TO authenticated;