
-- ============================================
-- FIX 1: tenant_plaid_transactions - restrict to service_role
-- ============================================
DROP POLICY IF EXISTS "Service role can manage tenant transactions" ON public.tenant_plaid_transactions;
CREATE POLICY "Service role can manage tenant transactions"
  ON public.tenant_plaid_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FIX 2: api_rate_limits - restrict to service_role
-- ============================================
DROP POLICY IF EXISTS "System can manage rate limits" ON public.api_rate_limits;
CREATE POLICY "System can manage rate limits"
  ON public.api_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FIX 3: asset_payment_transactions - restrict to service_role
-- ============================================
DROP POLICY IF EXISTS "System can manage payment transactions" ON public.asset_payment_transactions;
CREATE POLICY "System can manage payment transactions"
  ON public.asset_payment_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FIX 4: drive_time_cache - restrict to service_role
-- ============================================
DROP POLICY IF EXISTS "Service role can manage drive time cache" ON public.drive_time_cache;
CREATE POLICY "Service role can manage drive time cache"
  ON public.drive_time_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FIX 5: email_queue - restrict system policies to service_role
-- ============================================
DROP POLICY IF EXISTS "System can insert email queue entries" ON public.email_queue;
CREATE POLICY "System can insert email queue entries"
  ON public.email_queue
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can update email queue entries" ON public.email_queue;
CREATE POLICY "System can update email queue entries"
  ON public.email_queue
  FOR UPDATE
  TO service_role
  USING (true);

-- ============================================
-- FIX 6: newsletter_subscriptions - restrict system update to service_role
-- ============================================
DROP POLICY IF EXISTS "System can update newsletter subscriptions" ON public.newsletter_subscriptions;
CREATE POLICY "System can update newsletter subscriptions"
  ON public.newsletter_subscriptions
  FOR UPDATE
  TO service_role
  USING (true);

-- ============================================
-- FIX 7: platform_transactions - restrict system policies to service_role
-- ============================================
DROP POLICY IF EXISTS "System can insert transactions" ON public.platform_transactions;
CREATE POLICY "System can insert transactions"
  ON public.platform_transactions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can update transactions" ON public.platform_transactions;
CREATE POLICY "System can update transactions"
  ON public.platform_transactions
  FOR UPDATE
  TO service_role
  USING (true);

-- ============================================
-- FIX 8: referral_rewards - restrict to service_role
-- ============================================
DROP POLICY IF EXISTS "System can manage rewards" ON public.referral_rewards;
CREATE POLICY "System can manage rewards"
  ON public.referral_rewards
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FIX 9: subscriptions - consolidate and restrict to service_role
-- ============================================
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow subscription updates" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow subscription upserts" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FIX 10: tenant_invitations - restrict system update to service_role
-- ============================================
DROP POLICY IF EXISTS "System can update invitations during acceptance" ON public.tenant_invitations;
CREATE POLICY "System can update invitations during acceptance"
  ON public.tenant_invitations
  FOR UPDATE
  TO service_role
  USING (true);

-- ============================================
-- FIX 11: tenant_properties - restrict system manage to service_role
-- ============================================
DROP POLICY IF EXISTS "System can manage tenant property connections" ON public.tenant_properties;
CREATE POLICY "System can manage tenant property connections"
  ON public.tenant_properties
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FIX 12: ai_function_invocations - restrict to service_role properly
-- ============================================
DROP POLICY IF EXISTS "ai_function_invocations_service_access" ON public.ai_function_invocations;
CREATE POLICY "ai_function_invocations_service_access"
  ON public.ai_function_invocations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FIX 13: worker_sms_metrics view - add security_invoker
-- ============================================
CREATE OR REPLACE VIEW public.worker_sms_metrics
WITH (security_invoker=on) AS
SELECT m.sender_user_id AS worker_id,
    count(*) FILTER (WHERE (m.direction = 'outbound'::text)) AS messages_sent,
    count(*) FILTER (WHERE (m.direction = 'inbound'::text)) AS messages_received,
    count(*) FILTER (WHERE (m.delivery_status = 'delivered'::text)) AS delivered_count,
    count(*) FILTER (WHERE ((m.delivery_status = 'failed'::text) OR (m.delivery_status = 'undelivered'::text))) AS failed_count,
    round((((count(*) FILTER (WHERE (m.delivery_status = 'delivered'::text)))::numeric / (NULLIF(count(*) FILTER (WHERE (m.direction = 'outbound'::text)), 0))::numeric) * (100)::numeric), 1) AS delivery_rate_pct,
    count(DISTINCT m.conversation_id) AS total_conversations,
    min(m.created_at) AS first_message_at,
    max(m.created_at) AS last_message_at
FROM sms_messages m
WHERE ((m.sender_user_id IS NOT NULL) AND (m.sender_role = ANY (ARRAY['worker'::text, 'admin'::text])))
GROUP BY m.sender_user_id;
