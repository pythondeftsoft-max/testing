-- Update has_role function to also check system_admins
-- This ensures system admins automatically pass all role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Check user_roles table for specific role
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
    OR
    -- System admins automatically have all roles
    EXISTS (
      SELECT 1
      FROM public.system_admins
      WHERE user_id = _user_id
        AND is_active = true
    )
  )
$$;