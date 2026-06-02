-- Fix get_all_account_roles_with_emails() to return all columns expected by frontend
DROP FUNCTION IF EXISTS public.get_all_account_roles_with_emails();

CREATE OR REPLACE FUNCTION public.get_all_account_roles_with_emails()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_email text,
  role_name account_role_type,
  is_active boolean,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  added_by uuid,
  first_name text,
  last_name text,
  user_type text,
  last_sign_in_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    ar.id,
    ar.user_id,
    au.email AS user_email,
    ar.role_name,
    ar.is_active,
    ar.notes,
    ar.created_at,
    ar.updated_at,
    ar.added_by,
    p.first_name,
    p.last_name,
    p.user_type,
    au.last_sign_in_at
  FROM public.account_roles ar
  LEFT JOIN public.profiles p ON p.id = ar.user_id
  LEFT JOIN auth.users au ON au.id = ar.user_id
  ORDER BY ar.created_at DESC;
$$;