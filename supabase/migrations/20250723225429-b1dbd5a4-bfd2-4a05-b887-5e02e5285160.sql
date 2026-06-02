-- Fix circular dependency in account_roles RLS policies
-- The issue: current policies call has_account_role() which queries account_roles, creating circular dependency

-- Drop all existing problematic policies on account_roles
DROP POLICY IF EXISTS "Account owners can manage all account roles" ON public.account_roles;
DROP POLICY IF EXISTS "Account admin_partners can manage non-owner roles" ON public.account_roles;
DROP POLICY IF EXISTS "Users can view account roles" ON public.account_roles;

-- Create simple, non-circular policies

-- 1. Users can view their own account roles (no function calls)
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

-- 3. Account owners can manage all roles (using direct lookup, not function call)
CREATE POLICY "Account owners can manage all account roles"
ON public.account_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.account_roles ar
    WHERE ar.user_id = auth.uid()
    AND ar.role_name = 'owner'
    AND ar.is_active = true
  )
);

-- 4. Admin partners can manage non-owner roles (using direct lookup)
CREATE POLICY "Admin partners can manage non-owner roles"  
ON public.account_roles
FOR ALL
USING (
  role_name != 'owner' AND
  EXISTS (
    SELECT 1 FROM public.account_roles ar
    WHERE ar.user_id = auth.uid()
    AND ar.role_name IN ('owner', 'admin_partner')
    AND ar.is_active = true
  )
);

-- 5. Allow inserting new roles for account management
CREATE POLICY "Account managers can insert roles"
ON public.account_roles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_roles ar
    WHERE ar.user_id = auth.uid()
    AND ar.role_name IN ('owner', 'admin_partner')
    AND ar.is_active = true
  )
);