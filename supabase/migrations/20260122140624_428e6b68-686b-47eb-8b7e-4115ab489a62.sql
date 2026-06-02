-- Phase 2: Migrate RLS policies to use is_admin(auth.uid()) instead of profiles.user_type check
-- This prevents privilege escalation by using the system_admins table for authorization

-- ============================================
-- BATCH 1: Security & Platform Tables (11 policies)
-- ============================================

-- security_rules
DROP POLICY IF EXISTS "Admins can manage security rules" ON public.security_rules;
CREATE POLICY "Admins can manage security rules"
  ON public.security_rules
  FOR ALL
  USING (is_admin(auth.uid()));

-- ip_blocklist
DROP POLICY IF EXISTS "Admins can manage IP blocklist" ON public.ip_blocklist;
CREATE POLICY "Admins can manage IP blocklist"
  ON public.ip_blocklist
  FOR ALL
  USING (is_admin(auth.uid()));

-- ip_allowlist
DROP POLICY IF EXISTS "Admins can manage IP allowlist" ON public.ip_allowlist;
CREATE POLICY "Admins can manage IP allowlist"
  ON public.ip_allowlist
  FOR ALL
  USING (is_admin(auth.uid()));

-- alert_configurations
DROP POLICY IF EXISTS "Admins can manage alert configurations" ON public.alert_configurations;
CREATE POLICY "Admins can manage alert configurations"
  ON public.alert_configurations
  FOR ALL
  USING (is_admin(auth.uid()));

-- alert_history (SELECT)
DROP POLICY IF EXISTS "Admins can view alert history" ON public.alert_history;
CREATE POLICY "Admins can view alert history"
  ON public.alert_history
  FOR SELECT
  USING (is_admin(auth.uid()));

-- alert_history (UPDATE)
DROP POLICY IF EXISTS "Admins can acknowledge alerts" ON public.alert_history;
CREATE POLICY "Admins can acknowledge alerts"
  ON public.alert_history
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- automated_actions_log
DROP POLICY IF EXISTS "Admins can view automated actions log" ON public.automated_actions_log;
CREATE POLICY "Admins can view automated actions log"
  ON public.automated_actions_log
  FOR SELECT
  USING (is_admin(auth.uid()));

-- platform_configs (SELECT)
DROP POLICY IF EXISTS "Admins can view platform configs" ON public.platform_configs;
CREATE POLICY "Admins can view platform configs"
  ON public.platform_configs
  FOR SELECT
  USING (is_admin(auth.uid()));

-- platform_configs (UPDATE)
DROP POLICY IF EXISTS "Admins can update platform configs" ON public.platform_configs;
CREATE POLICY "Admins can update platform configs"
  ON public.platform_configs
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- platform_configs (INSERT)
DROP POLICY IF EXISTS "Admins can insert platform configs" ON public.platform_configs;
CREATE POLICY "Admins can insert platform configs"
  ON public.platform_configs
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- account_roles
DROP POLICY IF EXISTS "Admin read access" ON public.account_roles;
CREATE POLICY "Admin read access"
  ON public.account_roles
  FOR SELECT
  USING (is_admin(auth.uid()));

-- ============================================
-- BATCH 2: Property & Portfolio Tables (12 policies)
-- ============================================

-- properties
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
CREATE POLICY "Admins can view all properties"
  ON public.properties
  FOR SELECT
  USING (is_admin(auth.uid()));

-- portfolios
DROP POLICY IF EXISTS "Admins can insert portfolios" ON public.portfolios;
CREATE POLICY "Admins can insert portfolios"
  ON public.portfolios
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- property_units (SELECT) - combines admin + owner/portfolio access using portfolio_roles
DROP POLICY IF EXISTS "Users can view property units" ON public.property_units;
CREATE POLICY "Users can view property units"
  ON public.property_units
  FOR SELECT
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_units.property_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM portfolio_roles pr
          WHERE pr.portfolio_id = p.portfolio_id
          AND pr.user_id = auth.uid()
          AND pr.is_active = true
        )
      )
    )
  );

-- property_units (INSERT) - admin_partner, editor roles can insert
DROP POLICY IF EXISTS "Property owners can insert units" ON public.property_units;
CREATE POLICY "Property owners can insert units"
  ON public.property_units
  FOR INSERT
  WITH CHECK (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_units.property_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM portfolio_roles pr
          WHERE pr.portfolio_id = p.portfolio_id
          AND pr.user_id = auth.uid()
          AND pr.is_active = true
          AND pr.role_name IN ('admin_partner', 'editor')
        )
      )
    )
  );

-- property_units (UPDATE) - admin_partner, editor roles can update
DROP POLICY IF EXISTS "Property owners can update units" ON public.property_units;
CREATE POLICY "Property owners can update units"
  ON public.property_units
  FOR UPDATE
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_units.property_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM portfolio_roles pr
          WHERE pr.portfolio_id = p.portfolio_id
          AND pr.user_id = auth.uid()
          AND pr.is_active = true
          AND pr.role_name IN ('admin_partner', 'editor')
        )
      )
    )
  );

-- property_units (DELETE) - only admin_partner can delete
DROP POLICY IF EXISTS "Property owners can delete units" ON public.property_units;
CREATE POLICY "Property owners can delete units"
  ON public.property_units
  FOR DELETE
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_units.property_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM portfolio_roles pr
          WHERE pr.portfolio_id = p.portfolio_id
          AND pr.user_id = auth.uid()
          AND pr.is_active = true
          AND pr.role_name = 'admin_partner'
        )
      )
    )
  );

-- property_documents
DROP POLICY IF EXISTS "Admins can view all property documents" ON public.property_documents;
CREATE POLICY "Admins can view all property documents"
  ON public.property_documents
  FOR SELECT
  USING (is_admin(auth.uid()));

-- property_listing_contracts (SELECT)
DROP POLICY IF EXISTS "admin_view_all_contracts" ON public.property_listing_contracts;
CREATE POLICY "admin_view_all_contracts"
  ON public.property_listing_contracts
  FOR SELECT
  USING (is_admin(auth.uid()));

-- property_listing_contracts (INSERT)
DROP POLICY IF EXISTS "admin_insert_contracts" ON public.property_listing_contracts;
CREATE POLICY "admin_insert_contracts"
  ON public.property_listing_contracts
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- lease_renewals
DROP POLICY IF EXISTS "Admin select policy" ON public.lease_renewals;
CREATE POLICY "Admin select policy"
  ON public.lease_renewals
  FOR SELECT
  USING (is_admin(auth.uid()));

-- storage.objects (property-documents bucket)
DROP POLICY IF EXISTS "Property documents access" ON storage.objects;
CREATE POLICY "Property documents access"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'property-documents'
    AND (
      is_admin(auth.uid())
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

-- marketplace_events
DROP POLICY IF EXISTS "Admin access policy" ON public.marketplace_events;
CREATE POLICY "Admin access policy"
  ON public.marketplace_events
  FOR SELECT
  USING (is_admin(auth.uid()));

-- ============================================
-- BATCH 3: Financial & Operations Tables (8 policies)
-- ============================================

-- plaid_admin_transactions (SELECT)
DROP POLICY IF EXISTS "System admins can view" ON public.plaid_admin_transactions;
CREATE POLICY "System admins can view"
  ON public.plaid_admin_transactions
  FOR SELECT
  USING (is_admin(auth.uid()));

-- plaid_admin_transactions (INSERT)
DROP POLICY IF EXISTS "System admins can insert" ON public.plaid_admin_transactions;
CREATE POLICY "System admins can insert"
  ON public.plaid_admin_transactions
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- plaid_admin_transactions (UPDATE)
DROP POLICY IF EXISTS "System admins can update" ON public.plaid_admin_transactions;
CREATE POLICY "System admins can update"
  ON public.plaid_admin_transactions
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- matchmaker_actions
DROP POLICY IF EXISTS "Admins can view all matchmaker actions" ON public.matchmaker_actions;
CREATE POLICY "Admins can view all matchmaker actions"
  ON public.matchmaker_actions
  FOR SELECT
  USING (is_admin(auth.uid()));

-- matchmaker_stats
DROP POLICY IF EXISTS "Admins can view all matchmaker stats" ON public.matchmaker_stats;
CREATE POLICY "Admins can view all matchmaker stats"
  ON public.matchmaker_stats
  FOR SELECT
  USING (is_admin(auth.uid()));

-- worker_payouts
DROP POLICY IF EXISTS "Admins can manage all worker payouts" ON public.worker_payouts;
CREATE POLICY "Admins can manage all worker payouts"
  ON public.worker_payouts
  FOR ALL
  USING (is_admin(auth.uid()));

-- admin_messages (SELECT)
DROP POLICY IF EXISTS "Admins can view messages" ON public.admin_messages;
CREATE POLICY "Admins can view messages"
  ON public.admin_messages
  FOR SELECT
  USING (is_admin(auth.uid()));

-- admin_messages (INSERT)
DROP POLICY IF EXISTS "Admins can send messages" ON public.admin_messages;
CREATE POLICY "Admins can send messages"
  ON public.admin_messages
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- points_admin_audit
DROP POLICY IF EXISTS "Admins can view points audit" ON public.points_admin_audit;
CREATE POLICY "Admins can view points audit"
  ON public.points_admin_audit
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Add documentation comment
COMMENT ON POLICY "Admins can manage security rules" ON public.security_rules IS 'Phase 2 Security: Uses is_admin() function instead of profiles.user_type check';