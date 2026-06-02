-- Fix infinite recursion in system_admins RLS policies

-- 1. Create security definer function to check admin status without triggering recursive policy checks
CREATE OR REPLACE FUNCTION public.check_is_system_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.system_admins
    WHERE user_id = user_id_param
    AND is_active = true
  );
$$;

-- 2. Drop existing problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "System admins can view system admins" ON public.system_admins;
DROP POLICY IF EXISTS "System admins can insert system admins" ON public.system_admins;
DROP POLICY IF EXISTS "System admins can update system admins" ON public.system_admins;
DROP POLICY IF EXISTS "System admins can delete system admins" ON public.system_admins;

-- 3. Recreate policies using the security definer function to break recursive loop
CREATE POLICY "System admins can view system admins"
  ON public.system_admins FOR SELECT
  TO authenticated
  USING (public.check_is_system_admin(auth.uid()));

CREATE POLICY "System admins can insert system admins"
  ON public.system_admins FOR INSERT
  TO authenticated
  WITH CHECK (public.check_is_system_admin(auth.uid()));

CREATE POLICY "System admins can update system admins"
  ON public.system_admins FOR UPDATE
  TO authenticated
  USING (public.check_is_system_admin(auth.uid()));

CREATE POLICY "System admins can delete system admins"
  ON public.system_admins FOR DELETE
  TO authenticated
  USING (public.check_is_system_admin(auth.uid()));