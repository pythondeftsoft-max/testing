-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_all_system_admins();

-- Recreate get_all_system_admins with role_name included
CREATE OR REPLACE FUNCTION public.get_all_system_admins()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_email text,
  first_name text,
  last_name text,
  role_name text,
  granted_by uuid,
  granted_at timestamptz,
  notes text,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    sa.id,
    sa.user_id,
    au.email AS user_email,
    p.first_name,
    p.last_name,
    sa.role_name::text,
    sa.granted_by,
    sa.granted_at,
    sa.notes,
    sa.is_active,
    sa.created_at
  FROM public.system_admins sa
  LEFT JOIN public.profiles p ON p.id = sa.user_id
  LEFT JOIN auth.users au ON au.id = sa.user_id
  WHERE sa.is_active = true
  ORDER BY sa.created_at DESC;
$$;