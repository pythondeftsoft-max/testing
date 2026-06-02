-- Fix RLS policy that's causing permission denied for table users
-- The issue is that the policy directly accesses auth.users table instead of using get_user_email function

-- Drop the problematic policy that directly accesses auth.users
DROP POLICY IF EXISTS "System can access invitations for acceptance process" ON public.account_invitations;

-- Recreate the policy using the security definer function instead
CREATE POLICY "System can access invitations for acceptance process"
ON public.account_invitations
FOR ALL
USING (
  -- Allow service role operations or when specifically processing invitations
  (current_setting('role') = 'service_role') OR
  -- Allow existing authenticated access patterns using security definer function
  (auth.uid() IS NOT NULL AND (
    is_account_admin(auth.uid()) OR
    email = get_user_email(auth.uid())
  ))
);