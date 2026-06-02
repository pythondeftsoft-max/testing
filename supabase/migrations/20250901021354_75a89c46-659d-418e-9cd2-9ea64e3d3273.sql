-- Ensure portfolio role permissions are populated for the core roles
-- First, insert any missing portfolio permission objects if needed
INSERT INTO public.permission_objects (name, display_name, category, description, scope)
VALUES 
  ('portfolio_management', 'Portfolio Management', 'Portfolio', 'Manage portfolio settings and configuration', 'portfolio'),
  ('portfolio_access', 'Portfolio Access Control', 'Portfolio', 'Manage user access and roles within portfolio', 'portfolio'),
  ('portfolio_assets', 'Portfolio Assets', 'Portfolio', 'Manage portfolio assets and investments', 'portfolio'),
  ('portfolio_reports', 'Portfolio Reports', 'Portfolio', 'Access and generate portfolio reports', 'portfolio')
ON CONFLICT (name, scope) DO NOTHING;

-- Set up default permissions for portfolio roles
-- Admin Partner - full access
INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'admin_partner'::portfolio_role_type,
  po.id,
  true,
  true, 
  true,
  true
FROM public.permission_objects po
WHERE po.scope = 'portfolio'
ON CONFLICT (role_name, permission_object_id) DO UPDATE SET
  can_view = true,
  can_edit = true,
  can_delete = true,
  can_create = true;

-- Editor - view, edit, create (no delete)
INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'editor'::portfolio_role_type,
  po.id,
  true,
  true,
  false,
  true
FROM public.permission_objects po
WHERE po.scope = 'portfolio'
ON CONFLICT (role_name, permission_object_id) DO UPDATE SET
  can_view = true,
  can_edit = true,
  can_delete = false,
  can_create = true;

-- Viewer - view only
INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'viewer'::portfolio_role_type,
  po.id,
  true,
  false,
  false,
  false
FROM public.permission_objects po
WHERE po.scope = 'portfolio'
ON CONFLICT (role_name, permission_object_id) DO UPDATE SET
  can_view = true,
  can_edit = false,
  can_delete = false,
  can_create = false;

-- Maintenance - limited access to relevant objects only
INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'maintenance'::portfolio_role_type,
  po.id,
  true,
  CASE WHEN po.name IN ('properties', 'maintenance_requests') THEN true ELSE false END,
  false,
  CASE WHEN po.name = 'maintenance_requests' THEN true ELSE false END
FROM public.permission_objects po
WHERE po.scope = 'portfolio'
ON CONFLICT (role_name, permission_object_id) DO UPDATE SET
  can_view = true,
  can_edit = CASE WHEN po.name IN ('properties', 'maintenance_requests') THEN true ELSE false END,
  can_delete = false,
  can_create = CASE WHEN po.name = 'maintenance_requests' THEN true ELSE false END;