-- Phase 2: Account-Scoped Permissions Infrastructure

-- Create account_role_permissions table
CREATE TABLE IF NOT EXISTS public.account_role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name account_role_type NOT NULL,
  permission_object_id UUID NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_name, permission_object_id)
);

-- Enable RLS
ALTER TABLE public.account_role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for account_role_permissions
CREATE POLICY "Account owners can manage account role permissions"
ON public.account_role_permissions
FOR ALL
TO authenticated
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type]));

CREATE POLICY "Account admins can view account role permissions"
ON public.account_role_permissions
FOR SELECT
TO authenticated
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

-- Create account permission helper functions
CREATE OR REPLACE FUNCTION public.has_account_permission(
  p_user_id UUID,
  p_object TEXT,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_role account_role_type;
  permission_exists BOOLEAN := false;
BEGIN
  -- Get user's highest account role
  SELECT get_highest_account_role(p_user_id) INTO user_role;
  
  -- If no role found, deny access
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if permission exists for this role and object
  SELECT EXISTS (
    SELECT 1 
    FROM public.account_role_permissions arp
    JOIN public.permission_objects po ON arp.permission_object_id = po.id
    WHERE arp.role_name = user_role
    AND po.name = p_object
    AND po.scope = 'account'
    AND (
      (p_action = 'view' AND arp.can_view = true) OR
      (p_action = 'edit' AND arp.can_edit = true) OR
      (p_action = 'delete' AND arp.can_delete = true) OR
      (p_action = 'create' AND arp.can_create = true)
    )
  ) INTO permission_exists;
  
  RETURN permission_exists;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_account_role_permissions(p_role account_role_type)
RETURNS TABLE(
  object_name TEXT,
  display_name TEXT,
  category TEXT,
  description TEXT,
  can_view BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  can_create BOOLEAN
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.name as object_name,
    po.display_name,
    po.category,
    po.description,
    COALESCE(arp.can_view, false) as can_view,
    COALESCE(arp.can_edit, false) as can_edit,
    COALESCE(arp.can_delete, false) as can_delete,
    COALESCE(arp.can_create, false) as can_create
  FROM public.permission_objects po
  LEFT JOIN public.account_role_permissions arp ON (
    po.id = arp.permission_object_id AND arp.role_name = p_role
  )
  WHERE po.scope = 'account'
  AND po.is_active = true
  ORDER BY po.category, po.display_name;
END;
$$;

-- Seed initial account permissions for existing objects
INSERT INTO public.account_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'owner'::account_role_type,
  po.id,
  true, -- owners can view everything
  true, -- owners can edit everything
  true, -- owners can delete everything
  true  -- owners can create everything
FROM public.permission_objects po
WHERE po.scope = 'account'
ON CONFLICT (role_name, permission_object_id) DO NOTHING;

INSERT INTO public.account_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'admin_partner'::account_role_type,
  po.id,
  true, -- admin_partners can view most things
  CASE 
    WHEN po.name IN ('user_management', 'account_settings', 'billing') THEN true
    ELSE false
  END, -- admin_partners can edit specific objects
  false, -- admin_partners cannot delete by default
  CASE 
    WHEN po.name IN ('user_management') THEN true
    ELSE false
  END -- admin_partners can create users
FROM public.permission_objects po
WHERE po.scope = 'account'
ON CONFLICT (role_name, permission_object_id) DO NOTHING;

INSERT INTO public.account_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'support_assistant'::account_role_type,
  po.id,
  CASE 
    WHEN po.name IN ('user_management', 'system_logs') THEN true
    ELSE false
  END, -- support_assistants can view limited objects
  false, -- support_assistants cannot edit by default
  false, -- support_assistants cannot delete
  false  -- support_assistants cannot create by default
FROM public.permission_objects po
WHERE po.scope = 'account'
ON CONFLICT (role_name, permission_object_id) DO NOTHING;