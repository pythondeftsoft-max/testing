-- Step 1: Ensure unique constraint exists on user_preferences.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_preferences_user_id_key'
  ) THEN
    ALTER TABLE public.user_preferences 
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Step 2: Create a safe email lookup function (SECURITY DEFINER to access auth.users)
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Step 3: Fix portfolio_asset_invitations SELECT policy
DROP POLICY IF EXISTS "Invited users can view their invitations" ON portfolio_asset_invitations;
CREATE POLICY "Invited users can view their invitations" ON portfolio_asset_invitations
FOR SELECT TO authenticated
USING (invited_user_id = auth.uid() OR invited_email = public.get_current_user_email());

-- Step 4: Fix portfolio_asset_invitations UPDATE policy
DROP POLICY IF EXISTS "Invited users can update their invitation status" ON portfolio_asset_invitations;
CREATE POLICY "Invited users can update their invitation status" ON portfolio_asset_invitations
FOR UPDATE TO authenticated
USING (invited_user_id = auth.uid() OR invited_email = public.get_current_user_email());

-- Step 5: Fix system_admin_invitations SELECT policy
DROP POLICY IF EXISTS "Users can view their own invitations" ON system_admin_invitations;
CREATE POLICY "Users can view their own invitations" ON system_admin_invitations
FOR SELECT TO authenticated
USING (email = public.get_current_user_email() AND status = 'pending');