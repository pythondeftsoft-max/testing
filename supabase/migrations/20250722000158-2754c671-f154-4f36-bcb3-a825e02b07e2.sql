
-- Phase 2: Complete Database Security Fixes and Account Role Management

-- Fix remaining search_path function warnings
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  code_length INTEGER := 8;
  characters TEXT := 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  result TEXT := '';
  i INTEGER;
  char_index INTEGER;
BEGIN
  -- Generate random alphanumeric code
  FOR i IN 1..code_length LOOP
    char_index := floor(random() * length(characters) + 1);
    result := result || substr(characters, char_index, 1);
  END LOOP;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.referrals WHERE referral_code = result) LOOP
    result := '';
    FOR i IN 1..code_length LOOP
      char_index := floor(random() * length(characters) + 1);
      result := result || substr(characters, char_index, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Fix get_highest_account_role function
CREATE OR REPLACE FUNCTION public.get_highest_account_role(p_user_id uuid)
RETURNS account_role_type
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  highest_role account_role_type;
BEGIN
  -- Get highest role based on hierarchy: owner > co_owner > admin_partner > support_assistant
  SELECT role_name INTO highest_role
  FROM public.account_roles
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY 
    CASE role_name 
      WHEN 'owner' THEN 4
      WHEN 'co_owner' THEN 3
      WHEN 'admin_partner' THEN 2
      WHEN 'support_assistant' THEN 1
    END DESC
  LIMIT 1;
  
  RETURN highest_role;
END;
$$;

-- Fix has_account_role function
CREATE OR REPLACE FUNCTION public.has_account_role(user_id_param uuid, required_roles account_role_type[])
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.account_roles ar
    WHERE ar.user_id = user_id_param 
      AND ar.role_name = ANY(required_roles)
      AND ar.is_active = true
  );
END;
$$;

-- Fix is_account_admin function
CREATE OR REPLACE FUNCTION public.is_account_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.has_account_role(
    user_id_param, 
    ARRAY['owner'::account_role_type, 'co_owner'::account_role_type, 'admin_partner'::account_role_type]
  );
END;
$$;

-- Add function to get account role with user details
CREATE OR REPLACE FUNCTION public.get_account_roles_with_details()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  role_name account_role_type,
  granted_by uuid,
  granted_at timestamp with time zone,
  is_active boolean,
  notes text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  user_email text,
  user_first_name text,
  user_last_name text,
  granted_by_email text,
  granted_by_first_name text,
  granted_by_last_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.id,
    ar.user_id,
    ar.role_name,
    ar.granted_by,
    ar.granted_at,
    ar.is_active,
    ar.notes,
    ar.created_at,
    ar.updated_at,
    u.email as user_email,
    p.first_name as user_first_name,
    p.last_name as user_last_name,
    gu.email as granted_by_email,
    gp.first_name as granted_by_first_name,
    gp.last_name as granted_by_last_name
  FROM public.account_roles ar
  LEFT JOIN auth.users u ON ar.user_id = u.id
  LEFT JOIN public.profiles p ON ar.user_id = p.id
  LEFT JOIN auth.users gu ON ar.granted_by = gu.id
  LEFT JOIN public.profiles gp ON ar.granted_by = gp.id
  WHERE ar.is_active = true
  ORDER BY ar.created_at DESC;
END;
$$;

-- Add function to grant account role
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
  
  -- Grant the role
  INSERT INTO public.account_roles (user_id, role_name, granted_by, notes)
  VALUES (p_user_id, p_role_name, p_granted_by, p_notes)
  RETURNING id INTO new_role_id;
  
  RETURN new_role_id;
END;
$$;

-- Add function to revoke account role
CREATE OR REPLACE FUNCTION public.revoke_account_role(
  p_role_id uuid,
  p_revoked_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  role_record record;
  revoker_highest_role account_role_type;
  role_hierarchy_level int;
  revoker_hierarchy_level int;
BEGIN
  -- Get the role record
  SELECT * INTO role_record 
  FROM public.account_roles 
  WHERE id = p_role_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role not found or already revoked';
  END IF;
  
  -- Get revoker's highest role
  SELECT public.get_highest_account_role(p_revoked_by) INTO revoker_highest_role;
  
  -- Check if revoker has permission
  IF revoker_highest_role IS NULL THEN
    RAISE EXCEPTION 'Insufficient permissions to revoke roles';
  END IF;
  
  -- Get hierarchy levels
  SELECT CASE role_record.role_name
    WHEN 'owner' THEN 4
    WHEN 'co_owner' THEN 3
    WHEN 'admin_partner' THEN 2
    WHEN 'support_assistant' THEN 1
  END INTO role_hierarchy_level;
  
  SELECT CASE revoker_highest_role
    WHEN 'owner' THEN 4
    WHEN 'co_owner' THEN 3
    WHEN 'admin_partner' THEN 2
    WHEN 'support_assistant' THEN 1
  END INTO revoker_hierarchy_level;
  
  -- Only owners can revoke owner roles
  IF role_record.role_name = 'owner' AND revoker_highest_role != 'owner' THEN
    RAISE EXCEPTION 'Only owners can revoke owner roles';
  END IF;
  
  -- Can't revoke roles of equal or higher level (except owners can revoke owner roles)
  IF role_hierarchy_level >= revoker_hierarchy_level AND NOT (revoker_highest_role = 'owner' AND role_record.role_name = 'owner') THEN
    RAISE EXCEPTION 'Cannot revoke roles of equal or higher level than your own';
  END IF;
  
  -- Revoke the role (soft delete)
  UPDATE public.account_roles 
  SET is_active = false, 
      updated_at = now(),
      notes = COALESCE(notes || ' | ', '') || 'Revoked: ' || COALESCE(p_reason, 'No reason provided')
  WHERE id = p_role_id;
  
  RETURN true;
END;
$$;

-- Add audit table for account role changes
CREATE TABLE IF NOT EXISTS public.account_role_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role_name account_role_type NOT NULL,
  action text NOT NULL, -- 'granted', 'revoked', 'modified'
  performed_by uuid NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on audit table
ALTER TABLE public.account_role_audit ENABLE ROW LEVEL SECURITY;

-- Only account admins can view audit logs
CREATE POLICY "Account admins can view role audit logs"
ON public.account_role_audit
FOR SELECT
USING (public.is_account_admin(auth.uid()));

-- Add trigger for audit logging
CREATE OR REPLACE FUNCTION public.log_account_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.account_role_audit (
      role_id, user_id, role_name, action, performed_by, reason
    ) VALUES (
      NEW.id, NEW.user_id, NEW.role_name, 'granted', NEW.granted_by, NEW.notes
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = true AND NEW.is_active = false THEN
      INSERT INTO public.account_role_audit (
        role_id, user_id, role_name, action, performed_by, reason
      ) VALUES (
        NEW.id, NEW.user_id, NEW.role_name, 'revoked', auth.uid(), NEW.notes
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS account_role_audit_trigger ON public.account_roles;
CREATE TRIGGER account_role_audit_trigger
  AFTER INSERT OR UPDATE ON public.account_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_account_role_change();
