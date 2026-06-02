-- Fix delete_auth_user_data function to handle type mismatches
-- and add comprehensive auth table cleanup
CREATE OR REPLACE FUNCTION delete_auth_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete from auth.identities (UUID)
  DELETE FROM auth.identities WHERE user_id = target_user_id;
  
  -- Delete from auth.sessions (UUID)
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  
  -- Delete from auth.refresh_tokens (VARCHAR - needs cast!)
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id::text;
  
  -- Delete from auth.mfa_factors (UUID)
  DELETE FROM auth.mfa_factors WHERE user_id = target_user_id;
  
  -- Delete from auth.mfa_challenges (UUID)
  DELETE FROM auth.mfa_challenges WHERE factor_id IN (
    SELECT id FROM auth.mfa_factors WHERE user_id = target_user_id
  );
  
  -- Delete from auth.flow_state (UUID)
  DELETE FROM auth.flow_state WHERE user_id = target_user_id;
  
  -- Delete from auth.one_time_tokens (UUID)
  DELETE FROM auth.one_time_tokens WHERE user_id = target_user_id;
  
  -- Delete from auth.oauth_authorizations (UUID) 
  DELETE FROM auth.oauth_authorizations WHERE user_id = target_user_id;
  
  -- Delete from auth.oauth_consents (UUID)
  DELETE FROM auth.oauth_consents WHERE user_id = target_user_id;
  
  RAISE NOTICE 'Successfully deleted auth data for user %', target_user_id;
END;
$$;