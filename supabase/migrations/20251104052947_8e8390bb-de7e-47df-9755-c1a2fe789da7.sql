-- Drop existing functions that reference wrong columns
DROP FUNCTION IF EXISTS public.get_all_account_roles_with_emails();
DROP FUNCTION IF EXISTS public.get_user_account_roles(uuid);

-- Recreate get_all_account_roles_with_emails with correct column names
CREATE OR REPLACE FUNCTION public.get_all_account_roles_with_emails()
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_email text,
  role_name account_role_type,
  is_active boolean,
  notes text,
  granted_at timestamptz,
  granted_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
BEGIN
  -- Admin/Owner guard
  IF NOT (public.is_admin(auth.uid()) 
          OR public.has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type])) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT 
    ar.user_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.company_name, au.email) AS user_name,
    au.email AS user_email,
    ar.role_name,
    ar.is_active,
    ar.notes,
    ar.created_at AS granted_at,
    ar.added_by AS granted_by
  FROM public.account_roles ar
  LEFT JOIN public.profiles p ON p.id = ar.user_id
  LEFT JOIN auth.users au ON au.id = ar.user_id
  ORDER BY ar.created_at DESC;
END;
$$;

-- Recreate get_user_account_roles with correct column names
CREATE OR REPLACE FUNCTION public.get_user_account_roles(p_user_id UUID)
RETURNS TABLE(
  role_name account_role_type, 
  granted_at TIMESTAMP WITH TIME ZONE, 
  granted_by UUID
)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT 
    ar.role_name, 
    ar.created_at AS granted_at,
    ar.added_by AS granted_by
  FROM public.account_roles ar
  WHERE ar.user_id = p_user_id
  AND ar.is_active = true
  ORDER BY 
    CASE ar.role_name 
      WHEN 'owner' THEN 1
      WHEN 'admin_partner' THEN 2
      WHEN 'support_assistant' THEN 3
      ELSE 4
    END;
$$;