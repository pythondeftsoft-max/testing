-- Create System Admin Role Type Enum
CREATE TYPE system_admin_role_type AS ENUM (
  'super_admin',
  'operations_admin',
  'matchmaker'
);

-- Add Role Column to system_admins Table
ALTER TABLE system_admins 
ADD COLUMN role_name system_admin_role_type NOT NULL DEFAULT 'matchmaker';

-- Set admin@openkey.com as super_admin
UPDATE system_admins 
SET role_name = 'super_admin' 
WHERE user_id = '84b46bc8-1e8a-4f74-9349-0f765b364018';

-- Create System Admin Permissions Table
CREATE TABLE system_admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name system_admin_role_type NOT NULL,
  permission_object_id uuid NOT NULL REFERENCES permission_objects(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_name, permission_object_id)
);

ALTER TABLE system_admin_permissions ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage system admin permissions
CREATE POLICY "Super admins can manage system admin permissions"
ON system_admin_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = auth.uid() 
    AND role_name = 'super_admin'
    AND is_active = true
  )
);

-- Add System-Scoped Permission Objects
INSERT INTO permission_objects (name, display_name, category, description, scope, sort_order) VALUES
-- User Management
('system.user_accounts', 'User Accounts', 'User Management', 'View and manage tenant/landlord accounts', 'system', 1),
('system.system_admins', 'System Administrators', 'User Management', 'Manage platform administrators', 'system', 2),
('system.account_roles', 'Account Roles', 'User Management', 'Manage account-level role assignments', 'system', 3),

-- Matching & Operations
('system.match_records', 'Match Records', 'Operations', 'Create and manage tenant-landlord matches', 'system', 4),
('system.match_notes', 'Match Notes', 'Operations', 'Add notes and updates to matches', 'system', 5),
('system.support_tools', 'Support Tools', 'Operations', 'Access support and troubleshooting tools', 'system', 6),

-- Security & Access Control (Super Admin Only)
('system.role_permissions', 'Role Permissions', 'Security', 'Configure permissions for all role types', 'system', 7),
('system.security_settings', 'Security Settings', 'Security', 'Configure platform security settings', 'system', 8),
('system.access_policies', 'Access Policies', 'Security', 'Manage RLS policies and access control', 'system', 9),

-- Monitoring & Audit
('system.audit_logs', 'Audit Logs', 'Monitoring', 'View system-wide audit logs and activity', 'system', 10),
('system.rbac_logs', 'RBAC Logs', 'Monitoring', 'View role-based access control logs', 'system', 11),

-- Platform Settings (Super Admin Only)
('system.platform_settings', 'Platform Settings', 'Administration', 'Configure global platform settings', 'system', 12),
('system.feature_flags', 'Feature Flags', 'Administration', 'Manage feature toggles', 'system', 13);

-- Seed Default Permissions for Super Admin: Full Access
INSERT INTO system_admin_permissions (role_name, permission_object_id, can_view, can_edit, can_create, can_delete)
SELECT 
  'super_admin',
  id,
  true,
  true,
  true,
  true
FROM permission_objects WHERE scope = 'system';

-- Seed Default Permissions for Operations Admin: View/Edit/Create (NO Delete, NO Settings)
INSERT INTO system_admin_permissions (role_name, permission_object_id, can_view, can_edit, can_create, can_delete)
SELECT 
  'operations_admin',
  id,
  true,
  CASE 
    WHEN category IN ('Security', 'Administration') THEN false
    ELSE true
  END,
  CASE 
    WHEN category IN ('Security', 'Administration') THEN false
    ELSE true
  END,
  false
FROM permission_objects WHERE scope = 'system';

-- Seed Default Permissions for Matchmaker: View Accounts + Create/Edit Matches Only
INSERT INTO system_admin_permissions (role_name, permission_object_id, can_view, can_edit, can_create, can_delete)
SELECT 
  'matchmaker',
  id,
  CASE 
    WHEN name IN (
      'system.user_accounts',
      'system.match_records',
      'system.match_notes',
      'system.support_tools',
      'system.audit_logs'
    ) THEN true
    ELSE false
  END,
  CASE 
    WHEN name IN (
      'system.match_records',
      'system.match_notes'
    ) THEN true
    ELSE false
  END,
  CASE 
    WHEN name IN (
      'system.match_records',
      'system.match_notes'
    ) THEN true
    ELSE false
  END,
  false
FROM permission_objects WHERE scope = 'system';

-- Check System Admin Permission Function
CREATE OR REPLACE FUNCTION has_system_admin_permission(
  p_user_id uuid,
  p_object text,
  p_action text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_permission boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM system_admins sa
    JOIN system_admin_permissions sap ON sa.role_name = sap.role_name
    JOIN permission_objects po ON sap.permission_object_id = po.id
    WHERE sa.user_id = p_user_id
      AND sa.is_active = true
      AND po.name = p_object
      AND po.scope = 'system'
      AND (
        (p_action = 'view' AND sap.can_view) OR
        (p_action = 'edit' AND sap.can_edit) OR
        (p_action = 'create' AND sap.can_create) OR
        (p_action = 'delete' AND sap.can_delete)
      )
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$;

-- Get System Admin Role Permissions Function
CREATE OR REPLACE FUNCTION get_system_admin_role_permissions(
  p_role text
)
RETURNS TABLE (
  object_name text,
  display_name text,
  category text,
  description text,
  can_view boolean,
  can_edit boolean,
  can_delete boolean,
  can_create boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.name as object_name,
    po.display_name,
    po.category,
    po.description,
    COALESCE(sap.can_view, false) as can_view,
    COALESCE(sap.can_edit, false) as can_edit,
    COALESCE(sap.can_delete, false) as can_delete,
    COALESCE(sap.can_create, false) as can_create
  FROM permission_objects po
  LEFT JOIN system_admin_permissions sap 
    ON sap.permission_object_id = po.id 
    AND sap.role_name = p_role::system_admin_role_type
  WHERE po.scope = 'system'
    AND po.is_active = true
  ORDER BY po.category, po.sort_order, po.display_name;
END;
$$;