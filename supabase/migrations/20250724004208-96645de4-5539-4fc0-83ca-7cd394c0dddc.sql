-- Fix RLS policy to allow account owners to view all account roles for management
-- Drop the existing restrictive policy that only allows admin user_type
DROP POLICY IF EXISTS "Admins can view all account roles" ON public.account_roles;

-- Create new policy that allows both admin user types AND users with owner account role
CREATE POLICY "Admins and account owners can view all account roles"
ON public.account_roles
FOR SELECT
USING (
  -- Allow admin user types
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_type = 'admin'
  ))
  OR
  -- Allow users with owner account role
  has_account_role(auth.uid(), ARRAY['owner'::account_role_type])
);