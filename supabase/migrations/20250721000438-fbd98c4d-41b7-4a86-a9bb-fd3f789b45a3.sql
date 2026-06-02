
-- Step 1: Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_account_roles(user_id_param UUID)
RETURNS TABLE(role_name account_role_type)
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT ar.role_name
  FROM public.account_roles ar
  WHERE ar.user_id = user_id_param 
    AND ar.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.has_account_role(user_id_param UUID, required_roles account_role_type[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.account_roles ar
    WHERE ar.user_id = user_id_param 
      AND ar.role_name = ANY(required_roles)
      AND ar.is_active = true
  );
$$;

-- Step 2: Drop the problematic RLS policies
DROP POLICY IF EXISTS "Account owners can manage all account roles" ON public.account_roles;
DROP POLICY IF EXISTS "Account admin_partners can manage non-owner roles" ON public.account_roles;
DROP POLICY IF EXISTS "Users can view account roles" ON public.account_roles;

-- Step 3: Create new RLS policies using security definer functions
CREATE POLICY "Account owners can manage all account roles"
ON public.account_roles
FOR ALL
USING (
  has_account_role(auth.uid(), ARRAY['owner'::account_role_type])
);

CREATE POLICY "Account admin_partners can manage non-owner roles"
ON public.account_roles
FOR ALL
USING (
  role_name != 'owner'::account_role_type AND
  has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type])
);

CREATE POLICY "Users can view account roles"
ON public.account_roles
FOR SELECT
USING (true);

-- Step 4: Update the is_account_admin function to use security definer approach
CREATE OR REPLACE FUNCTION public.is_account_admin(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT has_account_role(user_id_param, ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]);
$$;

-- Step 5: Add foreign key constraint between account_roles and profiles
ALTER TABLE public.account_roles 
ADD CONSTRAINT account_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Step 6: Bootstrap the demo landlord user as owner
INSERT INTO public.account_roles (user_id, role_name, is_active, added_by)
VALUES (
  'b7843bb0-64bd-4ff3-9392-b73c111832ce', -- Demo landlord user ID
  'owner',
  true,
  'b7843bb0-64bd-4ff3-9392-b73c111832ce'  -- Self-assigned initially
)
ON CONFLICT (user_id, role_name) DO UPDATE SET
  is_active = true,
  updated_at = now();
