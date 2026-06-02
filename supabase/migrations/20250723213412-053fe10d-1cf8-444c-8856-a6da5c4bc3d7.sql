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

-- Admin partner role gets view and edit permissions for user management, full permissions for permissions
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
    can_view = true,
    can_edit = CASE WHEN permission_objects.name = 'permissions' THEN true ELSE false END,
    can_delete = false,
    can_create = CASE WHEN permission_objects.name = 'user_management' THEN true ELSE false END
FROM public.permission_objects 
WHERE permission_objects.id = role_permissions.permission_object_id;

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
    can_view = true,
    can_edit = false,
    can_delete = false,
    can_create = false;