-- Fix the search path for the new function
CREATE OR REPLACE FUNCTION public.check_existing_account_role_before_invite()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the invited email already has an active account role
  IF EXISTS (
    SELECT 1 
    FROM public.account_roles ar
    JOIN auth.users au ON ar.user_id = au.id
    WHERE au.email = NEW.email 
    AND ar.is_active = true
  ) THEN
    RAISE EXCEPTION 'User with email % already has an active account role', NEW.email
      USING ERRCODE = '23505'; -- unique_violation error code
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '';