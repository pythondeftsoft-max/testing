-- Create function to delete auth-related user data
-- This function has SECURITY DEFINER to access auth schema tables
CREATE OR REPLACE FUNCTION delete_auth_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete from auth.identities
  DELETE FROM auth.identities WHERE user_id = target_user_id;
  
  -- Delete from auth.sessions
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  
  -- Delete from auth.refresh_tokens
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id;
  
  -- Delete from auth.mfa_factors if exists
  DELETE FROM auth.mfa_factors WHERE user_id = target_user_id;
  
  -- Delete from auth.mfa_challenges if exists
  DELETE FROM auth.mfa_challenges WHERE user_id = target_user_id;
END;
$$;