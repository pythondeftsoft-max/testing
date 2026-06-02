-- Comprehensive migration to allow user deletion while preserving audit history
-- This migration modifies all foreign key constraints to auth.users to use ON DELETE SET NULL

-- 1. Account Activity Log
ALTER TABLE account_activity_log 
  DROP CONSTRAINT IF EXISTS account_activity_log_performed_by_fkey;

ALTER TABLE account_activity_log
  ADD CONSTRAINT account_activity_log_performed_by_fkey 
  FOREIGN KEY (performed_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 2. Alert Configurations
ALTER TABLE alert_configurations 
  DROP CONSTRAINT IF EXISTS alert_configurations_created_by_fkey;

ALTER TABLE alert_configurations
  ADD CONSTRAINT alert_configurations_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 3. Alert History
ALTER TABLE alert_history 
  DROP CONSTRAINT IF EXISTS alert_history_acknowledged_by_fkey;

ALTER TABLE alert_history
  ADD CONSTRAINT alert_history_acknowledged_by_fkey 
  FOREIGN KEY (acknowledged_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 4. Asset Valuations
ALTER TABLE asset_valuations 
  DROP CONSTRAINT IF EXISTS asset_valuations_created_by_fkey;

ALTER TABLE asset_valuations
  ADD CONSTRAINT asset_valuations_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 5. Background Checks
ALTER TABLE background_checks 
  DROP CONSTRAINT IF EXISTS background_checks_cancelled_by_fkey;

ALTER TABLE background_checks
  ADD CONSTRAINT background_checks_cancelled_by_fkey 
  FOREIGN KEY (cancelled_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 6. Domain Verification Audit
ALTER TABLE domain_verification_audit 
  DROP CONSTRAINT IF EXISTS domain_verification_audit_performed_by_fkey;

ALTER TABLE domain_verification_audit
  ADD CONSTRAINT domain_verification_audit_performed_by_fkey 
  FOREIGN KEY (performed_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 7. Domain Verifications
ALTER TABLE domain_verifications 
  DROP CONSTRAINT IF EXISTS domain_verifications_reset_by_fkey;

ALTER TABLE domain_verifications
  ADD CONSTRAINT domain_verifications_reset_by_fkey 
  FOREIGN KEY (reset_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 8. IP Allowlist
ALTER TABLE ip_allowlist 
  DROP CONSTRAINT IF EXISTS ip_allowlist_added_by_fkey;

ALTER TABLE ip_allowlist
  ADD CONSTRAINT ip_allowlist_added_by_fkey 
  FOREIGN KEY (added_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 9. IP Blocklist
ALTER TABLE ip_blocklist 
  DROP CONSTRAINT IF EXISTS ip_blocklist_blocked_by_fkey;

ALTER TABLE ip_blocklist
  ADD CONSTRAINT ip_blocklist_blocked_by_fkey 
  FOREIGN KEY (blocked_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 10. Maintenance Documents
ALTER TABLE maintenance_documents 
  DROP CONSTRAINT IF EXISTS maintenance_documents_uploaded_by_fkey;

ALTER TABLE maintenance_documents
  ADD CONSTRAINT maintenance_documents_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 11. Portfolio Asset Documents
ALTER TABLE portfolio_asset_documents 
  DROP CONSTRAINT IF EXISTS portfolio_asset_documents_uploaded_by_fkey;

ALTER TABLE portfolio_asset_documents
  ADD CONSTRAINT portfolio_asset_documents_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 12. Portfolio Assets
ALTER TABLE portfolio_assets 
  DROP CONSTRAINT IF EXISTS portfolio_assets_created_by_fkey;

ALTER TABLE portfolio_assets
  ADD CONSTRAINT portfolio_assets_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 13. Property Applications
ALTER TABLE property_applications 
  DROP CONSTRAINT IF EXISTS property_applications_assigned_worker_id_fkey;

ALTER TABLE property_applications
  ADD CONSTRAINT property_applications_assigned_worker_id_fkey 
  FOREIGN KEY (assigned_worker_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 14. Property Cash Flow
ALTER TABLE property_cash_flow 
  DROP CONSTRAINT IF EXISTS property_cash_flow_created_by_fkey;

ALTER TABLE property_cash_flow
  ADD CONSTRAINT property_cash_flow_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 15. Property Unit Documents
ALTER TABLE property_unit_documents 
  DROP CONSTRAINT IF EXISTS property_unit_documents_uploaded_by_fkey;

ALTER TABLE property_unit_documents
  ADD CONSTRAINT property_unit_documents_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 16. Rent Splits
ALTER TABLE rent_splits 
  DROP CONSTRAINT IF EXISTS rent_splits_tenant_id_fkey;

ALTER TABLE rent_splits
  ADD CONSTRAINT rent_splits_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 17. Security Rules
ALTER TABLE security_rules 
  DROP CONSTRAINT IF EXISTS security_rules_created_by_fkey;

ALTER TABLE security_rules
  ADD CONSTRAINT security_rules_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 18. System Admin Invitations - accepted_by
ALTER TABLE system_admin_invitations 
  DROP CONSTRAINT IF EXISTS system_admin_invitations_accepted_by_fkey;

ALTER TABLE system_admin_invitations
  ADD CONSTRAINT system_admin_invitations_accepted_by_fkey 
  FOREIGN KEY (accepted_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 19. System Admin Invitations - invited_by
ALTER TABLE system_admin_invitations 
  DROP CONSTRAINT IF EXISTS system_admin_invitations_invited_by_fkey;

ALTER TABLE system_admin_invitations
  ADD CONSTRAINT system_admin_invitations_invited_by_fkey 
  FOREIGN KEY (invited_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 20. System Admins
ALTER TABLE system_admins 
  DROP CONSTRAINT IF EXISTS system_admins_granted_by_fkey;

ALTER TABLE system_admins
  ADD CONSTRAINT system_admins_granted_by_fkey 
  FOREIGN KEY (granted_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;