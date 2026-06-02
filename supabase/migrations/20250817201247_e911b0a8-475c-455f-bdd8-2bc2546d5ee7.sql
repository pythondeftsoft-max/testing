-- Phase 2: Account-Scoped Permissions Infrastructure

-- First, add missing columns to permission_objects table
ALTER TABLE public.permission_objects 
ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'portfolio',
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing permission objects to have proper scope
UPDATE public.permission_objects SET scope = 'portfolio' WHERE scope = 'portfolio';

-- Insert account-scoped permission objects if they don't exist
INSERT INTO public.permission_objects (name, display_name, category, scope, description, is_active) VALUES
('user_management', 'User Management', 'Administration', 'account', 'Manage account users, roles, and permissions', true),
('account_settings', 'Account Settings', 'Administration', 'account', 'Configure account-level settings and preferences', true),
('billing', 'Billing & Subscriptions', 'Administration', 'account', 'Manage billing, subscriptions, and payment methods', true),
('system_logs', 'System Logs', 'Monitoring', 'account', 'View system logs and audit trails', true),
('security_settings', 'Security Settings', 'Security', 'account', 'Configure security policies and authentication', true),
('integrations', 'Integrations', 'Administration', 'account', 'Manage third-party integrations and APIs', true)
ON CONFLICT (name) DO NOTHING;

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
  user_role TEXT;
  permission_exists BOOLEAN := false;
BEGIN
  -- Get user's highest account role
  SELECT get_highest_account_role(p_user_id)::TEXT INTO user_role;
  
  -- If no role found, deny access
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if permission exists for this role and object
  SELECT EXISTS (
    SELECT 1 
    FROM public.account_role_permissions arp
    JOIN public.permission_objects po ON arp.permission_object_id = po.id
    WHERE arp.role_name::TEXT = user_role
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

CREATE OR REPLACE FUNCTION public.get_account_role_permissions(p_role TEXT)
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
    COALESCE(po.description, '') as description,
    COALESCE(arp.can_view, false) as can_view,
    COALESCE(arp.can_edit, false) as can_edit,
    COALESCE(arp.can_delete, false) as can_delete,
    COALESCE(arp.can_create, false) as can_create
  FROM public.permission_objects po
  LEFT JOIN public.account_role_permissions arp ON (
    po.id = arp.permission_object_id AND arp.role_name::TEXT = p_role
  )
  WHERE po.scope = 'account'
  AND po.is_active = true
  ORDER BY po.category, po.display_name;
END;
$$;