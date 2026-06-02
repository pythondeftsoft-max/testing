
-- Create permission objects table to define what can be controlled
CREATE TABLE public.permission_objects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create role permissions table to map roles to specific permissions
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name account_role_type NOT NULL,
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
CREATE POLICY "Anyone can view permission objects"
ON public.permission_objects
FOR SELECT
USING (is_active = true);

CREATE POLICY "Account admins can manage permission objects"
ON public.permission_objects
FOR ALL
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

-- RLS policies for role_permissions
CREATE POLICY "Users can view role permissions"
ON public.role_permissions
FOR SELECT
USING (true);

CREATE POLICY "Account owners can manage role permissions"
ON public.role_permissions
FOR ALL
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type]));

-- Create triggers for updated_at
CREATE TRIGGER update_permission_objects_updated_at
  BEFORE UPDATE ON public.permission_objects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed permission objects data
INSERT INTO public.permission_objects (name, display_name, description, category, sort_order) VALUES
-- People category
('tenants', 'Tenants', 'Manage tenant information and applications', 'People', 1),
('owners', 'Owners', 'Manage property owners and contacts', 'People', 2),
('vendors', 'Vendors', 'Manage vendor information and contacts', 'People', 3),
('contacts', 'Contacts', 'Manage general contacts and leads', 'People', 4),

-- Rentals category
('properties', 'Properties', 'Manage property listings and details', 'Rentals', 10),
('units', 'Units', 'Manage individual property units', 'Rentals', 11),
('leases', 'Leases', 'Manage lease agreements and renewals', 'Rentals', 12),
('rent_payments', 'Rent Payments', 'Track and manage rent payments', 'Rentals', 13),

-- Leasing category
('applications', 'Applications', 'Review and manage rental applications', 'Leasing', 20),
('showings', 'Showings', 'Schedule and manage property showings', 'Leasing', 21),
('screening', 'Screening', 'Perform background and credit checks', 'Leasing', 22),
('marketing', 'Marketing', 'Manage property marketing and listings', 'Leasing', 23),

-- Maintenance category
('maintenance_requests', 'Maintenance Requests', 'Handle maintenance and repair requests', 'Maintenance', 30),
('work_orders', 'Work Orders', 'Create and manage work orders', 'Maintenance', 31),
('inspections', 'Inspections', 'Schedule and conduct property inspections', 'Maintenance', 32),

-- Financial category
('accounting', 'Accounting', 'Manage financial records and reports', 'Financial', 40),
('invoices', 'Invoices', 'Create and manage invoices', 'Financial', 41),
('expenses', 'Expenses', 'Track and manage property expenses', 'Financial', 42),
('reports', 'Reports', 'Generate financial and operational reports', 'Financial', 43),

-- Portfolio category
('portfolios', 'Portfolios', 'Manage property portfolios', 'Portfolio', 50),
('analytics', 'Analytics', 'View performance analytics and metrics', 'Portfolio', 51);

-- Seed default role permissions
-- Owner role - full permissions
INSERT INTO public.role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 'owner'::account_role_type, id, true, true, true, true
FROM public.permission_objects;

-- Admin Partner role - most permissions except some sensitive areas
INSERT INTO public.role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 'admin_partner'::account_role_type, id, true, true, 
  CASE WHEN name IN ('accounting', 'expenses', 'reports') THEN false ELSE true END,
  true
FROM public.permission_objects;

-- Support Assistant role - mostly view permissions with limited edit
INSERT INTO public.role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 'support_assistant'::account_role_type, id, true, 
  CASE WHEN name IN ('properties', 'units', 'tenants', 'maintenance_requests') THEN true ELSE false END,
  false,
  CASE WHEN name IN ('maintenance_requests', 'contacts') THEN true ELSE false END
FROM public.permission_objects;

-- Create function to check user permission
CREATE OR REPLACE FUNCTION public.check_user_permission(
  user_id_param UUID,
  object_name TEXT,
  action TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    CASE action
      WHEN 'view' THEN rp.can_view
      WHEN 'edit' THEN rp.can_edit
      WHEN 'delete' THEN rp.can_delete
      WHEN 'create' THEN rp.can_create
      ELSE false
    END,
    false
  )
  FROM public.get_highest_account_role(user_id_param) har
  JOIN public.role_permissions rp ON rp.role_name = har
  JOIN public.permission_objects po ON po.id = rp.permission_object_id
  WHERE po.name = object_name;
$$;

-- Create function to get role permissions
CREATE OR REPLACE FUNCTION public.get_role_permissions(role_name_param account_role_type)
RETURNS TABLE(
  object_name TEXT,
  display_name TEXT,
  category TEXT,
  can_view BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  can_create BOOLEAN
)
LANGUAGE SQL
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
  LEFT JOIN public.role_permissions rp ON rp.permission_object_id = po.id 
    AND rp.role_name = role_name_param
  WHERE po.is_active = true
  ORDER BY po.category, po.sort_order;
$$;
