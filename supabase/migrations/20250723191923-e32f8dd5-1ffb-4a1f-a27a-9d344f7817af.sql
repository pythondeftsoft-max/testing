-- Create permission_objects table to define controllable resources
CREATE TABLE public.permission_objects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create role_permissions table to map roles to specific permissions
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL,
  permission_object_id UUID NOT NULL REFERENCES public.permission_objects(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_name, permission_object_id)
);

-- Enable RLS
ALTER TABLE public.permission_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for permission_objects
CREATE POLICY "Anyone can view active permission objects" 
ON public.permission_objects 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Account admins can manage permission objects" 
ON public.permission_objects 
FOR ALL 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

-- RLS policies for role_permissions
CREATE POLICY "Anyone can view role permissions" 
ON public.role_permissions 
FOR SELECT 
USING (true);

CREATE POLICY "Account owners can manage role permissions" 
ON public.role_permissions 
FOR ALL 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type]));

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_permission_objects_updated_at
BEFORE UPDATE ON public.permission_objects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed permission objects
INSERT INTO public.permission_objects (name, display_name, category) VALUES
-- People Management
('profiles', 'User Profiles', 'People'),
('account_roles', 'Account Roles', 'People'),
('portfolio_roles', 'Portfolio Roles', 'People'),

-- Rentals Management
('properties', 'Properties', 'Rentals'),
('property_units', 'Property Units', 'Rentals'),
('property_documents', 'Property Documents', 'Rentals'),

-- Leasing Management  
('property_applications', 'Property Applications', 'Leasing'),
('unit_applications', 'Unit Applications', 'Leasing'),
('viewing_appointments', 'Viewing Appointments', 'Leasing'),
('lease_renewals', 'Lease Renewals', 'Leasing'),

-- Maintenance Management
('maintenance_requests', 'Maintenance Requests', 'Maintenance'),

-- Financial Management
('rent_payments', 'Rent Payments', 'Financial'),
('rent_splits', 'Rent Splits', 'Financial'),
('hap_payments', 'HAP Payments', 'Financial'),
('subscriptions', 'Subscriptions', 'Financial'),

-- Portfolio Management
('portfolios', 'Portfolios', 'Portfolio'),
('portfolio_points', 'Portfolio Points', 'Portfolio'),
('portfolio_referral_stats', 'Portfolio Referral Stats', 'Portfolio');

-- Seed default role permissions
INSERT INTO public.role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'owner',
  po.id,
  true, true, true, true
FROM public.permission_objects po;

INSERT INTO public.role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'admin_partner',
  po.id,
  true,
  po.name NOT IN ('account_roles', 'subscriptions'),
  po.name NOT IN ('account_roles', 'subscriptions', 'portfolios'),
  po.name NOT IN ('account_roles', 'subscriptions')
FROM public.permission_objects po;

INSERT INTO public.role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'support_assistant',
  po.id,
  po.name IN ('properties', 'maintenance_requests', 'viewing_appointments'),
  po.name IN ('maintenance_requests'),
  false,
  po.name IN ('maintenance_requests')
FROM public.permission_objects po;

-- Function to check user permission
CREATE OR REPLACE FUNCTION public.check_user_permission(
  user_id_param UUID,
  object_name_param TEXT,
  action_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_role TEXT;
  has_permission BOOLEAN := false;
BEGIN
  -- Get user's highest account role
  SELECT get_highest_account_role(user_id_param)::TEXT INTO user_role;
  
  IF user_role IS NULL THEN
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
  FROM public.role_permissions rp
  JOIN public.permission_objects po ON rp.permission_object_id = po.id
  WHERE rp.role_name = user_role
    AND po.name = object_name_param
    AND po.is_active = true;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

-- Function to get role permissions
CREATE OR REPLACE FUNCTION public.get_role_permissions(role_name_param TEXT)
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
  FROM public.permission_objects po
  LEFT JOIN public.role_permissions rp ON po.id = rp.permission_object_id 
    AND rp.role_name = role_name_param
  WHERE po.is_active = true
  ORDER BY po.category, po.display_name;
$$;