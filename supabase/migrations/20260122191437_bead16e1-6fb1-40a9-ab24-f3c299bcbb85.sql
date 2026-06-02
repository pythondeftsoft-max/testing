-- Fix api_rate_limits (policy already existed)
DROP POLICY IF EXISTS "Service role can manage rate limits" ON api_rate_limits;
CREATE POLICY "Service role can manage rate limits" ON api_rate_limits
  FOR ALL TO service_role USING (true);

-- Continue Phase 2: Points & Rewards Tables (may have partially applied)

-- user_points
DROP POLICY IF EXISTS "Service role can insert user points" ON user_points;
DROP POLICY IF EXISTS "Service role can update user points" ON user_points;
DROP POLICY IF EXISTS "System can insert user points" ON user_points;
DROP POLICY IF EXISTS "System can update user points" ON user_points;
CREATE POLICY "Service role can insert user points" ON user_points
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update user points" ON user_points
  FOR UPDATE TO service_role USING (true);

-- referral_rewards
DROP POLICY IF EXISTS "Service role can manage referral rewards" ON referral_rewards;
DROP POLICY IF EXISTS "System can manage referral rewards" ON referral_rewards;
CREATE POLICY "Service role can manage referral rewards" ON referral_rewards
  FOR ALL TO service_role USING (true);

-- portfolio_points
DROP POLICY IF EXISTS "Service role can insert portfolio points" ON portfolio_points;
DROP POLICY IF EXISTS "System can insert portfolio points" ON portfolio_points;
CREATE POLICY "Service role can insert portfolio points" ON portfolio_points
  FOR INSERT TO service_role WITH CHECK (true);

-- portfolio_user_points
DROP POLICY IF EXISTS "Service role can insert portfolio user points" ON portfolio_user_points;
DROP POLICY IF EXISTS "System can insert portfolio user points" ON portfolio_user_points;
CREATE POLICY "Service role can insert portfolio user points" ON portfolio_user_points
  FOR INSERT TO service_role WITH CHECK (true);

-- points_history
DROP POLICY IF EXISTS "Service role can insert points history" ON points_history;
DROP POLICY IF EXISTS "System can insert points history" ON points_history;
CREATE POLICY "Service role can insert points history" ON points_history
  FOR INSERT TO service_role WITH CHECK (true);

-- Phase 3: Tenant/Property System Tables

-- tenant_properties
DROP POLICY IF EXISTS "Service role can manage tenant properties" ON tenant_properties;
DROP POLICY IF EXISTS "System can manage tenant properties" ON tenant_properties;
CREATE POLICY "Service role can manage tenant properties" ON tenant_properties
  FOR ALL TO service_role USING (true);

-- tenant_invitations
DROP POLICY IF EXISTS "Service role can update tenant invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "System can update tenant invitations" ON tenant_invitations;
CREATE POLICY "Service role can update tenant invitations" ON tenant_invitations
  FOR UPDATE TO service_role USING (true);

-- subscription_cancellation_requests
DROP POLICY IF EXISTS "Service role can manage cancellation requests" ON subscription_cancellation_requests;
DROP POLICY IF EXISTS "System can manage cancellation requests" ON subscription_cancellation_requests;
CREATE POLICY "Service role can manage cancellation requests" ON subscription_cancellation_requests
  FOR ALL TO service_role USING (true);

-- landlord_placement_fees
DROP POLICY IF EXISTS "Service role can insert placement fees" ON landlord_placement_fees;
DROP POLICY IF EXISTS "System can insert placement fees" ON landlord_placement_fees;
CREATE POLICY "Service role can insert placement fees" ON landlord_placement_fees
  FOR INSERT TO service_role WITH CHECK (true);

-- Phase 4: Logging & System Tables

-- account_activity_log
DROP POLICY IF EXISTS "Service role can insert activity logs" ON account_activity_log;
DROP POLICY IF EXISTS "System can insert activity logs" ON account_activity_log;
CREATE POLICY "Service role can insert activity logs" ON account_activity_log
  FOR INSERT TO service_role WITH CHECK (true);

-- security_audit_logs
DROP POLICY IF EXISTS "Service role can insert security audit logs" ON security_audit_logs;
DROP POLICY IF EXISTS "System can insert security audit logs" ON security_audit_logs;
CREATE POLICY "Service role can insert security audit logs" ON security_audit_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- payment_activity_log
DROP POLICY IF EXISTS "Service role can insert payment activity logs" ON payment_activity_log;
DROP POLICY IF EXISTS "System can insert payment activity logs" ON payment_activity_log;
CREATE POLICY "Service role can insert payment activity logs" ON payment_activity_log
  FOR INSERT TO service_role WITH CHECK (true);

-- email_queue
DROP POLICY IF EXISTS "Service role can insert email queue" ON email_queue;
DROP POLICY IF EXISTS "Service role can update email queue" ON email_queue;
DROP POLICY IF EXISTS "System can insert email queue" ON email_queue;
DROP POLICY IF EXISTS "System can update email queue" ON email_queue;
CREATE POLICY "Service role can insert email queue" ON email_queue
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update email queue" ON email_queue
  FOR UPDATE TO service_role USING (true);

-- webhook_events
DROP POLICY IF EXISTS "Service role can manage webhook events" ON webhook_events;
DROP POLICY IF EXISTS "System can insert webhook events" ON webhook_events;
DROP POLICY IF EXISTS "System can update webhook events" ON webhook_events;
DROP POLICY IF EXISTS "System can manage webhook events" ON webhook_events;
CREATE POLICY "Service role can manage webhook events" ON webhook_events
  FOR ALL TO service_role USING (true);

-- notifications
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "Service role can insert notifications" ON notifications
  FOR INSERT TO service_role WITH CHECK (true);

-- enterprise_security_audit
DROP POLICY IF EXISTS "Service role can insert enterprise security audit" ON enterprise_security_audit;
DROP POLICY IF EXISTS "System can insert enterprise security audit" ON enterprise_security_audit;
CREATE POLICY "Service role can insert enterprise security audit" ON enterprise_security_audit
  FOR INSERT TO service_role WITH CHECK (true);

-- Phase 5: Other System Tables

-- market_data_cache
DROP POLICY IF EXISTS "Service role can manage market data cache" ON market_data_cache;
DROP POLICY IF EXISTS "System can manage market data cache" ON market_data_cache;
CREATE POLICY "Service role can manage market data cache" ON market_data_cache
  FOR ALL TO service_role USING (true);

-- platform_transactions
DROP POLICY IF EXISTS "Service role can insert platform transactions" ON platform_transactions;
DROP POLICY IF EXISTS "Service role can update platform transactions" ON platform_transactions;
DROP POLICY IF EXISTS "System can insert platform transactions" ON platform_transactions;
DROP POLICY IF EXISTS "System can update platform transactions" ON platform_transactions;
CREATE POLICY "Service role can insert platform transactions" ON platform_transactions
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update platform transactions" ON platform_transactions
  FOR UPDATE TO service_role USING (true);

-- referrals
DROP POLICY IF EXISTS "Service role can update referrals" ON referrals;
DROP POLICY IF EXISTS "System can update referrals" ON referrals;
CREATE POLICY "Service role can update referrals" ON referrals
  FOR UPDATE TO service_role USING (true);

-- referral_tracking_events
DROP POLICY IF EXISTS "Service role can insert referral tracking events" ON referral_tracking_events;
DROP POLICY IF EXISTS "System can insert referral tracking events" ON referral_tracking_events;
CREATE POLICY "Service role can insert referral tracking events" ON referral_tracking_events
  FOR INSERT TO service_role WITH CHECK (true);

-- marketplace_application_events
DROP POLICY IF EXISTS "Service role can insert marketplace application events" ON marketplace_application_events;
DROP POLICY IF EXISTS "System can insert marketplace application events" ON marketplace_application_events;
CREATE POLICY "Service role can insert marketplace application events" ON marketplace_application_events
  FOR INSERT TO service_role WITH CHECK (true);

-- blog_seo_analytics
DROP POLICY IF EXISTS "Service role can insert blog SEO analytics" ON blog_seo_analytics;
DROP POLICY IF EXISTS "System can insert blog SEO analytics" ON blog_seo_analytics;
CREATE POLICY "Service role can insert blog SEO analytics" ON blog_seo_analytics
  FOR INSERT TO service_role WITH CHECK (true);

-- domain_verification_audit
DROP POLICY IF EXISTS "Service role can insert domain verification audit" ON domain_verification_audit;
DROP POLICY IF EXISTS "System can insert domain verification audit" ON domain_verification_audit;
CREATE POLICY "Service role can insert domain verification audit" ON domain_verification_audit
  FOR INSERT TO service_role WITH CHECK (true);

-- tax_transactions
DROP POLICY IF EXISTS "Service role can insert tax transactions" ON tax_transactions;
DROP POLICY IF EXISTS "System can insert tax transactions" ON tax_transactions;
CREATE POLICY "Service role can insert tax transactions" ON tax_transactions
  FOR INSERT TO service_role WITH CHECK (true);

-- production_metrics
DROP POLICY IF EXISTS "Service role can insert production metrics" ON production_metrics;
DROP POLICY IF EXISTS "System can insert production metrics" ON production_metrics;
CREATE POLICY "Service role can insert production metrics" ON production_metrics
  FOR INSERT TO service_role WITH CHECK (true);

-- rbac_access_logs
DROP POLICY IF EXISTS "Service role can insert RBAC access logs" ON rbac_access_logs;
DROP POLICY IF EXISTS "System can insert RBAC access logs" ON rbac_access_logs;
CREATE POLICY "Service role can insert RBAC access logs" ON rbac_access_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- property_limit_notifications
DROP POLICY IF EXISTS "Service role can insert property limit notifications" ON property_limit_notifications;
DROP POLICY IF EXISTS "System can insert property limit notifications" ON property_limit_notifications;
CREATE POLICY "Service role can insert property limit notifications" ON property_limit_notifications
  FOR INSERT TO service_role WITH CHECK (true);

-- portfolio_value_snapshots
DROP POLICY IF EXISTS "Service role can insert portfolio value snapshots" ON portfolio_value_snapshots;
DROP POLICY IF EXISTS "System can insert portfolio value snapshots" ON portfolio_value_snapshots;
CREATE POLICY "Service role can insert portfolio value snapshots" ON portfolio_value_snapshots
  FOR INSERT TO service_role WITH CHECK (true);

-- white_label_analytics
DROP POLICY IF EXISTS "Service role can insert white label analytics" ON white_label_analytics;
DROP POLICY IF EXISTS "System can insert white label analytics" ON white_label_analytics;
CREATE POLICY "Service role can insert white label analytics" ON white_label_analytics
  FOR INSERT TO service_role WITH CHECK (true);

-- white_label_audit_logs
DROP POLICY IF EXISTS "Service role can insert white label audit logs" ON white_label_audit_logs;
DROP POLICY IF EXISTS "System can insert white label audit logs" ON white_label_audit_logs;
CREATE POLICY "Service role can insert white label audit logs" ON white_label_audit_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- exchange_rates (keep SELECT public, change INSERT to service_role)
DROP POLICY IF EXISTS "Service role can insert exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "System can insert exchange rates" ON exchange_rates;
CREATE POLICY "Service role can insert exchange rates" ON exchange_rates
  FOR INSERT TO service_role WITH CHECK (true);