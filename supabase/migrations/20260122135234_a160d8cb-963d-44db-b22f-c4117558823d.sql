-- Phase 1: Lock down user_type column to prevent privilege escalation
-- This trigger prevents non-admin users from changing their user_type

CREATE OR REPLACE FUNCTION prevent_user_type_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check if user_type is actually being changed
  IF OLD.user_type IS DISTINCT FROM NEW.user_type THEN
    -- Only system admins can change user_type
    IF NOT is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only system administrators can change user_type';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
CREATE TRIGGER enforce_user_type_immutable
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_user_type_change();

-- Add comment for documentation
COMMENT ON FUNCTION prevent_user_type_change() IS 'Security: Prevents non-admin users from escalating privileges by changing their own user_type';