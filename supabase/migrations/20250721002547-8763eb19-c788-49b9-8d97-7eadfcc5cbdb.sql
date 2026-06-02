
-- Force drop and recreate all RLS policies on account_invitations table
-- This ensures the old policies are completely removed and new ones are applied

-- Drop all existing policies with CASCADE to ensure complete removal
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.account_invitations CASCADE;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.account_invitations CASCADE;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.account_invitations CASCADE;
DROP POLICY IF EXISTS "Account owners can manage invitations" ON public.account_invitations CASCADE;
DROP POLICY IF EXISTS "Invited users can view their invitations" ON public.account_invitations CASCADE;
DROP POLICY IF EXISTS "Account admins can view all invitations" ON public.account_invitations CASCADE;
DROP POLICY IF EXISTS "Account admins can create invitations" ON public.account_invitations CASCADE;
DROP POLICY IF EXISTS "Account admins can update invitations" ON public.account_invitations CASCADE;
DROP POLICY IF EXISTS "Invited users can view their invitations by email" ON public.account_invitations CASCADE;
DROP POLICY IF EXISTS "System can update invitations during acceptance" ON public.account_invitations CASCADE;

-- Recreate policies with correct is_account_admin function
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

-- Allow invited users to view their own invitations by email
CREATE POLICY "Invited users can view their invitations by email"
ON public.account_invitations
FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Allow system to update invitations during acceptance process
CREATE POLICY "System can update invitations during acceptance"
ON public.account_invitations
FOR UPDATE
TO authenticated
USING (true);
