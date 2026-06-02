-- Fix missing WITH CHECK clause on account_invitations RLS policy
-- This allows account admins to INSERT new invitation records

-- Drop the incomplete FOR ALL policy
DROP POLICY IF EXISTS "System can access invitations for acceptance process" ON public.account_invitations CASCADE;

-- Create comprehensive policies for account admins
CREATE POLICY "Account admins can view all invitations"
ON public.account_invitations
FOR SELECT
TO authenticated
USING (
  is_account_admin(auth.uid())
);

CREATE POLICY "Account admins can create invitations"
ON public.account_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  is_account_admin(auth.uid())
);

CREATE POLICY "Account admins can update invitations"
ON public.account_invitations
FOR UPDATE
TO authenticated
USING (
  is_account_admin(auth.uid())
)
WITH CHECK (
  is_account_admin(auth.uid())
);

-- Recreate the service role policy with proper WITH CHECK
CREATE POLICY "Service role can manage invitations"
ON public.account_invitations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);