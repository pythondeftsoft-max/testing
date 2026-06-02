-- Update is_account_admin function to recognize system admins
DROP FUNCTION IF EXISTS public.is_account_admin(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.is_account_admin(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Check if user has owner/admin_partner role OR is a system admin
  SELECT (
    public.has_account_role(
      user_id_param, 
      ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = user_id_param 
      AND user_type = 'admin'
    )
  );
$$;