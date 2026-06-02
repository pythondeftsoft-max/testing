-- Clean up orphaned pending invitations for users who already have active account roles
UPDATE public.account_invitations 
SET status = 'auto_accepted', 
    accepted_at = now(),
    updated_at = now()
WHERE status = 'pending' 
AND email IN (
  SELECT DISTINCT au.email 
  FROM public.account_roles ar
  JOIN auth.users au ON ar.user_id = au.id
  WHERE ar.is_active = true
);

-- Create a function to prevent duplicate invitations for users with existing roles
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
$$ LANGUAGE plpgsql;

-- Create trigger to prevent duplicate invitations
CREATE TRIGGER prevent_duplicate_invitations_trigger
  BEFORE INSERT ON public.account_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_existing_account_role_before_invite();