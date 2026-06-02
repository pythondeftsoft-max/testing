-- Fix the has_account_role and is_account_admin functions to resolve RLS policy errors

-- Drop and recreate has_account_role function with proper type handling
DROP FUNCTION IF EXISTS public.has_account_role(uuid, account_role_type[]);

CREATE OR REPLACE FUNCTION public.has_account_role(user_id_param UUID, required_roles account_role_type[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.account_roles ar
    WHERE ar.user_id = user_id_param 
      AND ar.role_name = ANY(required_roles)
      AND ar.is_active = true
  );
$$;

-- Drop and recreate is_account_admin function to use the fixed has_account_role
DROP FUNCTION IF EXISTS public.is_account_admin(uuid);

CREATE OR REPLACE FUNCTION public.is_account_admin(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT public.has_account_role(user_id_param, ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]);
$$;

-- Also ensure get_user_email function exists for RLS policies
CREATE OR REPLACE FUNCTION public.get_user_email(user_id_param uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
    SELECT email FROM auth.users WHERE id = user_id_param;
$$;