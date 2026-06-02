-- Modify rbac_change_logs foreign key constraints to allow deletion with null references
-- First, drop the existing foreign key constraints
ALTER TABLE rbac_change_logs 
  DROP CONSTRAINT IF EXISTS rbac_change_logs_actor_user_id_fkey;

ALTER TABLE rbac_change_logs 
  DROP CONSTRAINT IF EXISTS rbac_change_logs_target_user_id_fkey;

-- Add new foreign key constraints with ON DELETE SET NULL
ALTER TABLE rbac_change_logs
  ADD CONSTRAINT rbac_change_logs_actor_user_id_fkey 
  FOREIGN KEY (actor_user_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE rbac_change_logs
  ADD CONSTRAINT rbac_change_logs_target_user_id_fkey 
  FOREIGN KEY (target_user_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- Modify points_admin_audit foreign key constraints to allow deletion with null references
-- First, drop the existing foreign key constraints
ALTER TABLE points_admin_audit 
  DROP CONSTRAINT IF EXISTS points_admin_audit_admin_user_id_fkey;

ALTER TABLE points_admin_audit 
  DROP CONSTRAINT IF EXISTS points_admin_audit_target_user_id_fkey;

-- Add new foreign key constraints with ON DELETE SET NULL
ALTER TABLE points_admin_audit
  ADD CONSTRAINT points_admin_audit_admin_user_id_fkey 
  FOREIGN KEY (admin_user_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE points_admin_audit
  ADD CONSTRAINT points_admin_audit_target_user_id_fkey 
  FOREIGN KEY (target_user_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;