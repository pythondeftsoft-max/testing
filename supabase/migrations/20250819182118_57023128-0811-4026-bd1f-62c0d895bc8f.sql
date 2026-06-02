-- Add portfolio.assets permission object if it doesn't exist
INSERT INTO permission_objects (name, display_name, category, description, scope)
VALUES ('portfolio.assets', 'Portfolio Assets', 'portfolio', 'Manage portfolio assets including stocks, bonds, vehicles, boats, etc.', 'portfolio')
ON CONFLICT (name, scope) DO NOTHING;

-- Add default permissions for portfolio.assets
INSERT INTO portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
    'admin_partner',
    po.id,
    true,
    true,
    true,
    true
FROM permission_objects po
WHERE po.name = 'portfolio.assets' AND po.scope = 'portfolio'
ON CONFLICT (role_name, permission_object_id) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    can_create = EXCLUDED.can_create;

INSERT INTO portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
    'editor',
    po.id,
    true,
    true,
    false,
    true
FROM permission_objects po
WHERE po.name = 'portfolio.assets' AND po.scope = 'portfolio'
ON CONFLICT (role_name, permission_object_id) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    can_create = EXCLUDED.can_create;

INSERT INTO portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
    'viewer',
    po.id,
    true,
    false,
    false,
    false
FROM permission_objects po
WHERE po.name = 'portfolio.assets' AND po.scope = 'portfolio'
ON CONFLICT (role_name, permission_object_id) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    can_create = EXCLUDED.can_create;