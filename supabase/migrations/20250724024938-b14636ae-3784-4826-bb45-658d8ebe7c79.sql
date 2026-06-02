
-- Create portfolio permission objects table
CREATE TABLE public.portfolio_permission_objects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portfolio role permissions table
CREATE TABLE public.portfolio_role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name portfolio_role_type NOT NULL,
  permission_object_id UUID NOT NULL REFERENCES public.portfolio_permission_objects(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_name, permission_object_id)
);

-- Enable RLS
ALTER TABLE public.portfolio_permission_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for portfolio_permission_objects
CREATE POLICY "Anyone can view active portfolio permission objects" 
ON public.portfolio_permission_objects 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Account admins can manage portfolio permission objects" 
ON public.portfolio_permission_objects 
FOR ALL 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

-- RLS policies for portfolio_role_permissions
CREATE POLICY "Anyone can view portfolio role permissions" 
ON public.portfolio_role_permissions 
FOR SELECT 
USING (true);

CREATE POLICY "Account owners can manage portfolio role permissions" 
ON public.portfolio_role_permissions 
FOR ALL 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type]));

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_portfolio_permission_objects_updated_at
BEFORE UPDATE ON public.portfolio_permission_objects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolio_role_permissions_updated_at
BEFORE UPDATE ON public.portfolio_role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed portfolio permission objects
INSERT INTO public.portfolio_permission_objects (name, display_name, category) VALUES
-- Property Management
('properties', 'Properties', 'Property Management'),
('property_units', 'Property Units', 'Property Management'),
('property_documents', 'Property Documents', 'Property Management'),

-- Tenant Management
('tenant_profiles', 'Tenant Profiles', 'Tenant Management'),
('tenant_applications', 'Tenant Applications', 'Tenant Management'),
('lease_agreements', 'Lease Agreements', 'Tenant Management'),

-- Maintenance Management
('maintenance_requests', 'Maintenance Requests', 'Maintenance'),
('maintenance_schedules', 'Maintenance Schedules', 'Maintenance'),

-- Financial Management
('rent_payments', 'Rent Payments', 'Financial'),
('expenses', 'Expenses', 'Financial'),
('financial_reports', 'Financial Reports', 'Financial'),

-- Portfolio Management
('portfolio_settings', 'Portfolio Settings', 'Portfolio'),
('portfolio_team', 'Portfolio Team', 'Portfolio'),
('portfolio_analytics', 'Portfolio Analytics', 'Portfolio');

-- Seed default portfolio role permissions
INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'admin_partner'::portfolio_role_type,
  po.id,
  true, true, true, true
FROM public.portfolio_permission_objects po;

INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'editor'::portfolio_role_type,
  po.id,
  true,
  po.name NOT IN ('portfolio_settings', 'portfolio_team'),
  po.name NOT IN ('portfolio_settings', 'portfolio_team', 'properties'),
  po.name NOT IN ('portfolio_settings', 'portfolio_team')
FROM public.portfolio_permission_objects po;

INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'viewer'::portfolio_role_type,
  po.id,
  po.name NOT IN ('portfolio_settings', 'portfolio_team'),
  false,
  false,
  false
FROM public.portfolio_permission_objects po;

INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'maintenance'::portfolio_role_type,
  po.id,
  po.name IN ('maintenance_requests', 'maintenance_schedules', 'properties', 'property_units'),
  po.name IN ('maintenance_requests', 'maintenance_schedules'),
  false,
  po.name IN ('maintenance_requests', 'maintenance_schedules')
FROM public.portfolio_permission_objects po;

-- Function to check portfolio user permission
CREATE OR REPLACE FUNCTION public.check_portfolio_user_permission(
  user_id_param UUID,
  portfolio_id_param UUID,
  object_name_param TEXT,
  action_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_portfolio_role portfolio_role_type;
  has_permission BOOLEAN := false;
BEGIN
  -- Get user's role in this portfolio
  SELECT pr.role_name INTO user_portfolio_role
  FROM public.portfolio_roles pr
  WHERE pr.portfolio_id = portfolio_id_param
    AND pr.user_id = user_id_param
    AND pr.is_active = true
  ORDER BY pr.permissions_level DESC
  LIMIT 1;
  
  -- If user has no role in this portfolio, check if they're portfolio manager
  IF user_portfolio_role IS NULL THEN
    -- Check if user is the portfolio manager
    SELECT CASE WHEN manager_id = user_id_param THEN 'admin_partner'::portfolio_role_type ELSE NULL END
    INTO user_portfolio_role
    FROM public.portfolios
    WHERE id = portfolio_id_param;
  END IF;
  
  -- If still no role, check if user is admin
  IF user_portfolio_role IS NULL THEN
    SELECT CASE WHEN is_admin(user_id_param) THEN 'admin_partner'::portfolio_role_type ELSE NULL END
    INTO user_portfolio_role;
  END IF;
  
  IF user_portfolio_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check permission based on action
  SELECT 
    CASE action_param
      WHEN 'view' THEN rp.can_view
      WHEN 'edit' THEN rp.can_edit
      WHEN 'delete' THEN rp.can_delete
      WHEN 'create' THEN rp.can_create
      ELSE false
    END INTO has_permission
  FROM public.portfolio_role_permissions rp
  JOIN public.portfolio_permission_objects po ON rp.permission_object_id = po.id
  WHERE rp.role_name = user_portfolio_role
    AND po.name = object_name_param
    AND po.is_active = true;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

-- Function to get portfolio role permissions
CREATE OR REPLACE FUNCTION public.get_portfolio_role_permissions(role_name_param portfolio_role_type)
RETURNS TABLE(
  object_name TEXT,
  display_name TEXT,
  category TEXT,
  can_view BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  can_create BOOLEAN
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    po.name,
    po.display_name,
    po.category,
    COALESCE(rp.can_view, false),
    COALESCE(rp.can_edit, false),
    COALESCE(rp.can_delete, false),
    COALESCE(rp.can_create, false)
  FROM public.portfolio_permission_objects po
  LEFT JOIN public.portfolio_role_permissions rp ON po.id = rp.permission_object_id 
    AND rp.role_name = role_name_param
  WHERE po.is_active = true
  ORDER BY po.category, po.display_name;
$$;

-- Function to update portfolio role permissions
CREATE OR REPLACE FUNCTION public.update_portfolio_role_permissions(
  role_name_param portfolio_role_type,
  permissions JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  permission_record JSONB;
  permission_object_id UUID;
BEGIN
  -- Only allow account owners to update permissions
  IF NOT has_account_role(auth.uid(), ARRAY['owner'::account_role_type]) THEN
    RAISE EXCEPTION 'Access denied: Only account owners can update portfolio role permissions';
  END IF;
  
  -- Loop through permissions array
  FOR permission_record IN SELECT * FROM jsonb_array_elements(permissions)
  LOOP
    -- Get the permission object ID
    SELECT id INTO permission_object_id
    FROM public.portfolio_permission_objects
    WHERE name = permission_record->>'object_name'
      AND is_active = true;
    
    IF permission_object_id IS NOT NULL THEN
      -- Update or insert permission
      INSERT INTO public.portfolio_role_permissions (
        role_name,
        permission_object_id,
        can_view,
        can_edit,
        can_delete,
        can_create
      )
      VALUES (
        role_name_param,
        permission_object_id,
        (permission_record->>'can_view')::boolean,
        (permission_record->>'can_edit')::boolean,
        (permission_record->>'can_delete')::boolean,
        (permission_record->>'can_create')::boolean
      )
      ON CONFLICT (role_name, permission_object_id)
      DO UPDATE SET
        can_view = EXCLUDED.can_view,
        can_edit = EXCLUDED.can_edit,
        can_delete = EXCLUDED.can_delete,
        can_create = EXCLUDED.can_create,
        updated_at = now();
    END IF;
  END LOOP;
END;
$$;
