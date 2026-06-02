-- Add RLS policy to allow service role access to account_invitations during acceptance
-- This allows the accept-invitation edge function to query and update invitations

CREATE POLICY "Service role can access invitations during acceptance"
ON public.account_invitations
FOR ALL
TO service_role
USING (true);

-- Also ensure authenticated users with service role can access during system operations
CREATE POLICY "System can access invitations for acceptance process"
ON public.account_invitations
FOR ALL
USING (
  -- Allow service role operations or when specifically processing invitations
  (current_setting('role') = 'service_role') OR
  -- Allow existing authenticated access patterns
  (auth.uid() IS NOT NULL AND (
    is_account_admin(auth.uid()) OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ))
);