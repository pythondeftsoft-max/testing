
-- Fix account_roles table schema alignment and add missing columns
-- This addresses the column name mismatch causing permission issues

-- First, add the missing columns with proper defaults
ALTER TABLE public.account_roles 
ADD COLUMN IF NOT EXISTS granted_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS granted_at timestamp with time zone DEFAULT now();

-- Migrate existing data from added_by to granted_by
UPDATE public.account_roles 
SET granted_by = added_by,
    granted_at = created_at
WHERE granted_by IS NULL;

-- Now we can safely drop the old added_by column (optional, keeping for backwards compatibility)
-- ALTER TABLE public.account_roles DROP COLUMN IF EXISTS added_by;

-- Update the grant_account_role function to use correct column names
CREATE OR REPLACE FUNCTION public.grant_account_role(
  p_user_id uuid,
  p_role_name account_role_type,
  p_granted_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_role_id uuid;
  granter_highest_role account_role_type;
  role_hierarchy_level int;
  granter_hierarchy_level int;
BEGIN
  -- Get granter's highest role
  SELECT public.get_highest_account_role(p_granted_by) INTO granter_highest_role;
  
  -- Check if granter has permission to grant this role
  IF granter_highest_role IS NULL THEN
    RAISE EXCEPTION 'Insufficient permissions to grant roles';
  END IF;
  
  -- Get hierarchy levels
  SELECT CASE p_role_name
    WHEN 'owner' THEN 4
    WHEN 'co_owner' THEN 3
    WHEN 'admin_partner' THEN 2
    WHEN 'support_assistant' THEN 1
  END INTO role_hierarchy_level;
  
  SELECT CASE granter_highest_role
    WHEN 'owner' THEN 4
    WHEN 'co_owner' THEN 3
    WHEN 'admin_partner' THEN 2
    WHEN 'support_assistant' THEN 1
  END INTO granter_hierarchy_level;
  
  -- Only owners can grant owner roles
  IF p_role_name = 'owner' AND granter_highest_role != 'owner' THEN
    RAISE EXCEPTION 'Only owners can grant owner roles';
  END IF;
  
  -- Can't grant roles of equal or higher level (except owners can grant owner roles)
  IF role_hierarchy_level >= granter_hierarchy_level AND NOT (granter_highest_role = 'owner' AND p_role_name = 'owner') THEN
    RAISE EXCEPTION 'Cannot grant roles of equal or higher level than your own';
  END IF;
  
  -- Check if user already has this role
  IF EXISTS (
    SELECT 1 FROM public.account_roles 
    WHERE user_id = p_user_id 
    AND role_name = p_role_name 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'User already has this role';
  END IF;
  
  -- Grant the role with correct column names
  INSERT INTO public.account_roles (user_id, role_name, granted_by, granted_at, notes)
  VALUES (p_user_id, p_role_name, p_granted_by, now(), p_notes)
  RETURNING id INTO new_role_id;
  
  RETURN new_role_id;
END;
$$;

-- Add initial owner role for demo landlord if they don't have one
-- This ensures the current user has proper access
DO $$
DECLARE
  demo_user_id uuid;
BEGIN
  -- Find the demo landlord user (you may need to adjust this query based on your data)
  SELECT id INTO demo_user_id 
  FROM auth.users 
  WHERE email LIKE '%demo%' OR email LIKE '%landlord%'
  LIMIT 1;
  
  -- If we found a demo user and they don't have an owner role, grant it
  IF demo_user_id IS NOT NULL THEN
    INSERT INTO public.account_roles (user_id, role_name, granted_by, granted_at, notes)
    VALUES (demo_user_id, 'owner', demo_user_id, now(), 'Initial owner role for demo user')
    ON CONFLICT (user_id, role_name) DO NOTHING
    WHERE NOT EXISTS (
      SELECT 1 FROM public.account_roles 
      WHERE user_id = demo_user_id 
      AND role_name = 'owner' 
      AND is_active = true
    );
  END IF;
END $$;

-- Add unique constraint to prevent duplicate active roles
ALTER TABLE public.account_roles 
ADD CONSTRAINT unique_active_user_role 
UNIQUE (user_id, role_name) 
DEFERRABLE INITIALLY DEFERRED;
