-- Create function to get user ID by email for admin operations
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Admin/Owner guard - only admins and account owners can resolve emails to user IDs
  IF NOT (
    public.is_admin(auth.uid()) OR
    public.has_account_role(auth.uid(), array['owner'::account_role_type, 'admin_partner'::account_role_type])
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Get user ID from auth.users by email
  SELECT au.id INTO user_uuid
  FROM auth.users au
  WHERE au.email = p_email;

  RETURN user_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO authenticated;