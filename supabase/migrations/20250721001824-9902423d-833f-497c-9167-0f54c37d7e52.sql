
-- Drop existing conflicting functions to avoid confusion
DROP FUNCTION IF EXISTS public.is_account_admin(uuid);

-- Create the consolidated is_account_admin function with consistent parameter naming
CREATE OR REPLACE FUNCTION public.is_account_admin(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT has_account_role(user_id_param, ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]);
$$;

-- Also ensure the supporting functions exist and are properly defined
CREATE OR REPLACE FUNCTION public.get_user_account_roles(user_id_param UUID)
RETURNS TABLE(role_name account_role_type)
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT ar.role_name
  FROM public.account_roles ar
  WHERE ar.user_id = user_id_param 
    AND ar.is_active = true;
$$;

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

-- Force a schema cache refresh by updating the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
