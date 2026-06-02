-- Create a function that allows the first user to become admin
CREATE OR REPLACE FUNCTION public.claim_admin_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  -- Check if any admins exist
  SELECT COUNT(*) INTO admin_count
  FROM public.user_roles
  WHERE role = 'admin';
  
  -- If no admins exist, allow current user to become admin
  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.claim_admin_role() TO authenticated;