
-- Add missing notes column to account_roles table
ALTER TABLE public.account_roles 
ADD COLUMN IF NOT EXISTS notes text;

-- Update the account_role_type enum to include support_assistant
-- First check if support_assistant already exists
DO $$ 
BEGIN
    -- Add support_assistant to the enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'support_assistant' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'account_role_type'
        )
    ) THEN
        ALTER TYPE account_role_type ADD VALUE 'support_assistant';
    END IF;
END $$;

-- Update the grant_account_role function to handle the new column and enum
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
    WHEN 'admin_partner' THEN 3
    WHEN 'support_assistant' THEN 2
    ELSE 1
  END INTO role_hierarchy_level;
  
  SELECT CASE granter_highest_role
    WHEN 'owner' THEN 4
    WHEN 'admin_partner' THEN 3
    WHEN 'support_assistant' THEN 2
    ELSE 1
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
  
  -- Grant the role
  INSERT INTO public.account_roles (user_id, role_name, added_by, notes)
  VALUES (p_user_id, p_role_name, p_granted_by, p_notes)
  RETURNING id INTO new_role_id;
  
  RETURN new_role_id;
END;
$$;
