-- Add portfolio.assets permission object if it doesn't exist
INSERT INTO permission_objects (name, display_name, category, description, scope)
VALUES ('portfolio.assets', 'Portfolio Assets', 'portfolio', 'Manage portfolio assets including stocks, bonds, vehicles, boats, etc.', 'portfolio')
ON CONFLICT (name) DO NOTHING;

-- Add default permissions for portfolio.assets
DO $$
DECLARE
    assets_permission_id UUID;
BEGIN
    -- Get the permission object ID
    SELECT id INTO assets_permission_id 
    FROM permission_objects 
    WHERE name = 'portfolio.assets' AND scope = 'portfolio';
    
    -- Insert permissions for admin_partner
    INSERT INTO portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
    VALUES ('admin_partner', assets_permission_id, true, true, true, true)
    ON CONFLICT DO NOTHING;
    
    -- Insert permissions for editor
    INSERT INTO portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
    VALUES ('editor', assets_permission_id, true, true, false, true)
    ON CONFLICT DO NOTHING;
    
    -- Insert permissions for viewer  
    INSERT INTO portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
    VALUES ('viewer', assets_permission_id, true, false, false, false)
    ON CONFLICT DO NOTHING;
END $$;