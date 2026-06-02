-- Add missing permission objects for user management and permissions
INSERT INTO public.permission_objects (name, display_name, category) VALUES
('user_management', 'User Management', 'Administration'),
('permissions', 'Permissions Management', 'Administration')
ON CONFLICT (name) DO NOTHING;

-- Set up role permissions for the new objects
-- Owner role gets all permissions
INSERT INTO public.role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
    'owner'::account_role_type,
    po.id,
    true,
    true,
    true,
    true
FROM public.permission_objects po
WHERE po.name IN ('user_management', 'permissions')
ON CONFLICT (role_name, permission_object_id) DO UPDATE SET
    can_view = true,
    can_edit = true,
    can_delete = true,
    can_create = true;

-- Admin partner role gets create permissions for user management, edit permissions for permissions
INSERT INTO public.role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
    'admin_partner'::account_role_type,
    po.id,
    true,
    CASE WHEN po.name = 'permissions' THEN true ELSE false END,
    false,
    CASE WHEN po.name = 'user_management' THEN true ELSE false END
FROM public.permission_objects po
WHERE po.name IN ('user_management', 'permissions')
ON CONFLICT (role_name, permission_object_id) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    can_create = EXCLUDED.can_create;

-- Support assistant role gets view only permissions
INSERT INTO public.role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
    'support_assistant'::account_role_type,
    po.id,
    true,
    false,
    false,
    false
FROM public.permission_objects po
WHERE po.name IN ('user_management', 'permissions')
ON CONFLICT (role_name, permission_object_id) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    can_create = EXCLUDED.can_create;