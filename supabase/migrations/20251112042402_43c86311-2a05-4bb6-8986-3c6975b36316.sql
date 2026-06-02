-- Drop old admin_soft_delete_property function signature that logs to rbac_event_logs with wrong column name
DROP FUNCTION IF EXISTS admin_soft_delete_property(UUID, TEXT, JSONB);

-- The new single-parameter function already exists from previous migration and correctly logs to security_audit_log