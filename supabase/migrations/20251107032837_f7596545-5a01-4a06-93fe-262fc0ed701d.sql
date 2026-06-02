-- Create a helper function to safely retrieve the current user's email
-- This uses SECURITY DEFINER so it can access auth.users table
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid();
$$;

-- Drop existing problematic policies that directly query auth.users
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.portfolio_invitations;
DROP POLICY IF EXISTS "Users can update their own invitation status" ON public.portfolio_invitations;

-- Recreate policies using the safe helper function
CREATE POLICY "Users can view their own invitations"
ON public.portfolio_invitations
FOR SELECT
TO public
USING (
  invited_user_id = auth.uid() 
  OR invited_email = public.get_current_user_email()
);

CREATE POLICY "Users can update their own invitation status"
ON public.portfolio_invitations
FOR UPDATE
TO public
USING (
  invited_user_id = auth.uid() 
  OR invited_email = public.get_current_user_email()
)
WITH CHECK (
  invited_user_id = auth.uid() 
  OR invited_email = public.get_current_user_email()
);