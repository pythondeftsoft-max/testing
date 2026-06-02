-- Add missing permission objects for admin functionality
INSERT INTO public.permission_objects (name, display_name, description, category, scope) VALUES
('admin.portfolio_management', 'Portfolio Management', 'Access to portfolio management features in admin dashboard', 'Admin', 'account'),
('admin.user_management', 'User Management', 'Access to user management features in admin dashboard', 'Admin', 'account'),
('admin.system_settings', 'System Settings', 'Access to system settings in admin dashboard', 'Admin', 'account')
ON CONFLICT (name, scope) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- Grant permissions to owner and admin_partner roles for admin objects
INSERT INTO public.role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create) 
SELECT 
  r.role_name,
  po.id,
  true as can_view,
  CASE WHEN r.role_name = 'owner' THEN true ELSE false END as can_edit,
  CASE WHEN r.role_name = 'owner' THEN true ELSE false END as can_delete,
  CASE WHEN r.role_name = 'owner' THEN true ELSE false END as can_create
FROM (VALUES ('owner'), ('admin_partner')) AS r(role_name)
CROSS JOIN public.permission_objects po
WHERE po.name IN ('admin.portfolio_management', 'admin.user_management', 'admin.system_settings')
  AND po.scope = 'account'
ON CONFLICT (role_name, permission_object_id) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete,
  can_create = EXCLUDED.can_create;