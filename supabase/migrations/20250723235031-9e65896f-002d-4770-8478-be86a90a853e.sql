-- Fix the has_account_role and is_account_admin functions to resolve RLS policy errors
-- Use CASCADE to drop functions that have dependencies

-- Drop and recreate has_account_role function with proper type handling
DROP FUNCTION IF EXISTS public.has_account_role(uuid, account_role_type[]) CASCADE;

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
DROP FUNCTION IF EXISTS public.is_account_admin(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.is_account_admin(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT public.has_account_role(user_id_param, ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]);
$$;

-- Recreate the dropped policies that depend on has_account_role
CREATE POLICY "Account role managers can view profiles for user lookup" 
ON public.profiles 
FOR SELECT 
USING (
  has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type])
);

CREATE POLICY "Security admins can view all sessions" 
ON public.user_sessions 
FOR SELECT 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "Security admins can view MFA status" 
ON public.mfa_tokens 
FOR SELECT 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "Security admins can manage incidents" 
ON public.security_incidents 
FOR ALL 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "Account admins can view backup logs" 
ON public.enterprise_backup_logs 
FOR SELECT 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "Account owners can manage enterprise settings" 
ON public.enterprise_settings 
FOR ALL 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type]));

CREATE POLICY "Account admins can manage permission objects" 
ON public.permission_objects 
FOR ALL 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));