-- Fix circular dependency by removing ALL policies that query account_roles within account_roles policies
-- Keep only the basic policies that don't create circular dependencies

-- Drop all existing policies on account_roles
DROP POLICY IF EXISTS "Account owners can manage all account roles" ON public.account_roles;
DROP POLICY IF EXISTS "Admin partners can manage non-owner roles" ON public.account_roles;
DROP POLICY IF EXISTS "Admins can view all account roles" ON public.account_roles;
DROP POLICY IF EXISTS "Users can view their own account roles" ON public.account_roles;
DROP POLICY IF EXISTS "Account managers can insert roles" ON public.account_roles;

-- Create ONLY non-circular policies

-- 1. Users can view their own account roles (no function calls, no table queries)
CREATE POLICY "Users can view their own account roles"
ON public.account_roles
FOR SELECT
USING (user_id = auth.uid());

-- 2. Allow admins to view all account roles (using direct profile lookup to avoid circular dependency)
CREATE POLICY "Admins can view all account roles"
ON public.account_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_type = 'admin'
  )
);