
-- Update account_invitations RLS policies to allow account admins to manage invitations

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.account_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.account_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.account_invitations;

-- Create new policies that allow account admins (owner/admin_partner roles) to manage invitations
CREATE POLICY "Account admins can view all invitations"
ON public.account_invitations
FOR SELECT
TO authenticated
USING (is_account_admin(auth.uid()));

CREATE POLICY "Account admins can create invitations"
ON public.account_invitations
FOR INSERT
TO authenticated
WITH CHECK (is_account_admin(auth.uid()));

CREATE POLICY "Account admins can update invitations"
ON public.account_invitations
FOR UPDATE
TO authenticated
USING (is_account_admin(auth.uid()));

-- Keep the existing policy for invited users to view their own invitations
-- This policy should already exist but let's ensure it's correct
CREATE POLICY "Invited users can view their invitations by email"
ON public.account_invitations
FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Keep the system policy for invitation acceptance
CREATE POLICY "System can update invitations during acceptance"
ON public.account_invitations
FOR UPDATE
TO authenticated
USING (true);
