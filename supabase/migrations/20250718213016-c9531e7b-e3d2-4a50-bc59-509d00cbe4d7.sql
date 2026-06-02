
-- First, create a security definer function to safely check portfolio roles without RLS recursion
CREATE OR REPLACE FUNCTION public.check_portfolio_role_safe(p_portfolio_id uuid, p_user_id uuid, p_roles portfolio_role_type[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolio_roles
    WHERE portfolio_id = p_portfolio_id
    AND user_id = p_user_id
    AND role_name = ANY(p_roles)
    AND is_active = true
  );
$$;

-- Update the has_portfolio_role function to use the security definer function
CREATE OR REPLACE FUNCTION public.has_portfolio_role(p_portfolio_id uuid, p_user_id uuid, p_roles portfolio_role_type[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $$
  SELECT check_portfolio_role_safe(p_portfolio_id, p_user_id, p_roles);
$$;

-- Reset existing portfolio invitation notifications back to unread status
UPDATE public.notifications 
SET read = false, updated_at = now()
WHERE type IN ('portfolio_invite', 'account_invite') 
AND read = true
AND created_at > (now() - interval '7 days');

-- Also create a function to check if a user is admin without recursion issues
CREATE OR REPLACE FUNCTION public.is_admin_safe(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
    AND user_type = 'admin'::user_type
  );
$$;

-- Update the is_admin function to use the security definer function
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $$
  SELECT is_admin_safe(user_id);
$$;
