
-- ============================================================
-- Phase 1: Security Hardening Migration (additive, non-destructive)
-- Fixes 16 of 21 security findings without breaking app functionality.
-- ============================================================

-- 1) housing_authorities: drop anon read; keep authenticated.
DROP POLICY IF EXISTS "Anyone can view active housing authorities" ON public.housing_authorities;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='housing_authorities'
    AND policyname='Authenticated can view active housing authorities'
  ) THEN
    CREATE POLICY "Authenticated can view active housing authorities"
      ON public.housing_authorities FOR SELECT
      TO authenticated
      USING (is_active = true);
  END IF;
END $$;

-- 2) white_label_configs: drop public-anon SELECT; provide a SECURITY DEFINER
--    RPC that returns ONLY safe branding columns for subdomain lookup.
DROP POLICY IF EXISTS "Public can view active white label configs by subdomain" ON public.white_label_configs;

CREATE OR REPLACE FUNCTION public.get_white_label_public_by_subdomain(subdomain_param text)
RETURNS TABLE (
  id uuid,
  company_name text,
  company_logo_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  custom_subdomain text,
  custom_domain text,
  favicon_url text,
  footer_text text,
  is_active boolean,
  theme_preset text,
  landing_page_config jsonb,
  email_template_config jsonb,
  advanced_customization jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, company_name, company_logo_url, primary_color, secondary_color,
         accent_color, custom_subdomain, custom_domain, favicon_url, footer_text,
         is_active, theme_preset, landing_page_config, email_template_config,
         advanced_customization
  FROM public.white_label_configs
  WHERE custom_subdomain = subdomain_param AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_white_label_public_by_subdomain(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_white_label_public_by_domain(domain_param text)
RETURNS TABLE (
  id uuid,
  company_name text,
  company_logo_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  custom_subdomain text,
  custom_domain text,
  favicon_url text,
  footer_text text,
  is_active boolean,
  theme_preset text,
  landing_page_config jsonb,
  email_template_config jsonb,
  advanced_customization jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, company_name, company_logo_url, primary_color, secondary_color,
         accent_color, custom_subdomain, custom_domain, favicon_url, footer_text,
         is_active, theme_preset, landing_page_config, email_template_config,
         advanced_customization
  FROM public.white_label_configs
  WHERE custom_domain = domain_param AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_white_label_public_by_domain(text) TO anon, authenticated;

-- 3) notifications: tighten INSERT to user_id=auth.uid() (service_role bypasses RLS).
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Authenticated can create own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4) rbac_event_logs: remove broad authenticated INSERT (RPC log_rbac_event is SECURITY DEFINER).
DROP POLICY IF EXISTS "System can insert RBAC event logs" ON public.rbac_event_logs;

-- 5) matchmaker_actions: tighten INSERT to worker_id=auth.uid() OR admin.
DROP POLICY IF EXISTS "System can insert matchmaker actions" ON public.matchmaker_actions;
CREATE POLICY "Workers insert own matchmaker actions"
  ON public.matchmaker_actions FOR INSERT
  TO authenticated
  WITH CHECK (worker_id = auth.uid() OR is_admin(auth.uid()));

-- 6) agency_vms_submissions: pin policies to {authenticated} role for clarity.
DROP POLICY IF EXISTS "Agency admins can insert VMS submissions" ON public.agency_vms_submissions;
DROP POLICY IF EXISTS "Agency admins can update VMS submissions" ON public.agency_vms_submissions;
DROP POLICY IF EXISTS "Agency staff can view VMS submissions" ON public.agency_vms_submissions;

CREATE POLICY "VMS insert by finance/admin"
  ON public.agency_vms_submissions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM agency_staff s
            WHERE s.user_id = auth.uid() AND s.agency_id = agency_vms_submissions.agency_id
              AND s.is_active = true
              AND s.role = ANY (ARRAY['agency_admin'::agency_role,'executive_director'::agency_role,'finance'::agency_role]))
    OR is_admin(auth.uid())
  );

CREATE POLICY "VMS update by finance/admin"
  ON public.agency_vms_submissions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agency_staff s
            WHERE s.user_id = auth.uid() AND s.agency_id = agency_vms_submissions.agency_id
              AND s.is_active = true
              AND s.role = ANY (ARRAY['agency_admin'::agency_role,'executive_director'::agency_role,'finance'::agency_role]))
    OR is_admin(auth.uid())
  );

CREATE POLICY "VMS select by agency staff"
  ON public.agency_vms_submissions FOR SELECT TO authenticated
  USING (is_agency_staff(auth.uid(), agency_id) OR is_admin(auth.uid()));

-- 7) rfta_packets: add expiry column + tighten share-token read.
ALTER TABLE public.rfta_packets
  ADD COLUMN IF NOT EXISTS share_token_expires_at timestamptz;

DROP POLICY IF EXISTS "Anyone can read rfta_packets by share_token" ON public.rfta_packets;
CREATE POLICY "Read rfta_packets by share_token (with expiry)"
  ON public.rfta_packets FOR SELECT
  TO anon, authenticated
  USING (
    share_token IS NOT NULL
    AND (share_token_expires_at IS NULL OR share_token_expires_at > now())
  );

-- 8) landlord_hap_paid_ytd: recreate with security_invoker=on (Supabase definer-view finding).
DROP VIEW IF EXISTS public.landlord_hap_paid_ytd;
CREATE VIEW public.landlord_hap_paid_ytd
  WITH (security_invoker = on) AS
  SELECT hap_disbursements.landlord_id,
         hap_disbursements.agency_id,
         date_trunc('year'::text, hap_disbursements.paid_at)::date AS tax_year,
         sum(hap_disbursements.amount) AS total_paid,
         count(*) AS payment_count
  FROM public.hap_disbursements
  WHERE hap_disbursements.status = 'paid'::text
    AND hap_disbursements.paid_at IS NOT NULL
  GROUP BY hap_disbursements.landlord_id, hap_disbursements.agency_id,
           (date_trunc('year'::text, hap_disbursements.paid_at));

GRANT SELECT ON public.landlord_hap_paid_ytd TO authenticated;

-- 9) agency_eiv_records: restrict to caseworker/admin/ED/finance roles.
DROP POLICY IF EXISTS "Agency staff manage own eiv records" ON public.agency_eiv_records;
CREATE POLICY "EIV records: caseworker/finance/admin only"
  ON public.agency_eiv_records FOR ALL
  TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM agency_staff s
               WHERE s.user_id = auth.uid()
                 AND s.agency_id = agency_eiv_records.agency_id
                 AND s.is_active = true
                 AND s.role = ANY (ARRAY['agency_admin'::agency_role,'executive_director'::agency_role,'finance'::agency_role,'caseworker'::agency_role,'caseworker_supervisor'::agency_role]))
  )
  WITH CHECK (
    is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM agency_staff s
               WHERE s.user_id = auth.uid()
                 AND s.agency_id = agency_eiv_records.agency_id
                 AND s.is_active = true
                 AND s.role = ANY (ARRAY['agency_admin'::agency_role,'executive_director'::agency_role,'finance'::agency_role,'caseworker'::agency_role,'caseworker_supervisor'::agency_role]))
  );

-- 10) agency_nacha_settings: restrict SELECT/UPDATE/INSERT to finance/admin/ED.
DROP POLICY IF EXISTS "nacha_settings_select" ON public.agency_nacha_settings;
DROP POLICY IF EXISTS "nacha_settings_insert" ON public.agency_nacha_settings;
DROP POLICY IF EXISTS "nacha_settings_update" ON public.agency_nacha_settings;

CREATE POLICY "nacha_settings_select_finance"
  ON public.agency_nacha_settings FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM agency_staff s
               WHERE s.user_id = auth.uid() AND s.agency_id = agency_nacha_settings.agency_id
                 AND s.is_active = true
                 AND s.role = ANY (ARRAY['agency_admin'::agency_role,'executive_director'::agency_role,'finance'::agency_role]))
  );

CREATE POLICY "nacha_settings_insert_finance"
  ON public.agency_nacha_settings FOR INSERT TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM agency_staff s
               WHERE s.user_id = auth.uid() AND s.agency_id = agency_nacha_settings.agency_id
                 AND s.is_active = true
                 AND s.role = ANY (ARRAY['agency_admin'::agency_role,'executive_director'::agency_role,'finance'::agency_role]))
  );

CREATE POLICY "nacha_settings_update_finance"
  ON public.agency_nacha_settings FOR UPDATE TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM agency_staff s
               WHERE s.user_id = auth.uid() AND s.agency_id = agency_nacha_settings.agency_id
                 AND s.is_active = true
                 AND s.role = ANY (ARRAY['agency_admin'::agency_role,'executive_director'::agency_role,'finance'::agency_role]))
  )
  WITH CHECK (
    is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM agency_staff s
               WHERE s.user_id = auth.uid() AND s.agency_id = agency_nacha_settings.agency_id
                 AND s.is_active = true
                 AND s.role = ANY (ARRAY['agency_admin'::agency_role,'executive_director'::agency_role,'finance'::agency_role]))
  );

-- 11) agency_payment_rails: restrict to finance/admin/ED.
DROP POLICY IF EXISTS "Agency staff can view their payment rails" ON public.agency_payment_rails;
DROP POLICY IF EXISTS "Agency admins can insert payment rails" ON public.agency_payment_rails;
DROP POLICY IF EXISTS "Agency admins can update payment rails" ON public.agency_payment_rails;
DROP POLICY IF EXISTS "Agency admins can delete payment rails" ON public.agency_payment_rails;

CREATE POLICY "Payment rails select finance/admin"
  ON public.agency_payment_rails FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM agency_staff s
               WHERE s.user_id = auth.uid() AND s.agency_id = agency_payment_rails.agency_id
                 AND s.is_active = true
                 AND s.role = ANY (ARRAY['agency_admin'::agency_role,'executive_director'::agency_role,'finance'::agency_role]))
  );

CREATE POLICY "Payment rails insert finance/admin"
  ON public.agency_payment_rails FOR INSERT TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM agency_staff s
               WHERE s.user_id = auth.uid() AND s.agency_id = agency_payment_rails.agency_id
                 AND s.is_active = true
                 AND s.role = ANY (ARRAY['agency_admin'::agency_role,'executive_director'::agency_role,'finance'::agency_role]))
  );

CREATE POLICY "Payment rails update finance/admin"
  ON public.agency_payment_rails FOR UPDATE TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM agency_staff s
               WHERE s.user_id = auth.uid() AND s.agency_id = agency_payment_rails.agency_id
                 AND s.is_active = true
                 AND s.role = ANY (ARRAY['agency_admin'::agency_role,'executive_director'::agency_role,'finance'::agency_role]))
  );

CREATE POLICY "Payment rails delete finance/admin"
  ON public.agency_payment_rails FOR DELETE TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM agency_staff s
               WHERE s.user_id = auth.uid() AND s.agency_id = agency_payment_rails.agency_id
                 AND s.is_active = true
                 AND s.role = ANY (ARRAY['agency_admin'::agency_role,'executive_director'::agency_role,'finance'::agency_role]))
  );

-- 12) tax_profiles + portfolio_tax_profiles + landlord_payout_profiles:
--     remove 'viewer' from SELECT policies. Owners and admin/editor keep access.
DROP POLICY IF EXISTS "Portfolio members can view tax profiles" ON public.tax_profiles;
CREATE POLICY "Tax profiles: editors+admins view"
  ON public.tax_profiles FOR SELECT TO authenticated
  USING (
    portfolio_id IS NOT NULL
    AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'editor'::portfolio_role_type])
  );

DROP POLICY IF EXISTS "Members can view portfolio tax profiles" ON public.portfolio_tax_profiles;
CREATE POLICY "Portfolio tax profiles: editors+admins view"
  ON public.portfolio_tax_profiles FOR SELECT TO authenticated
  USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'editor'::portfolio_role_type]));

DROP POLICY IF EXISTS "Portfolio managers can view payout profiles" ON public.landlord_payout_profiles;
CREATE POLICY "Payout profiles: editors+admins view"
  ON public.landlord_payout_profiles FOR SELECT TO authenticated
  USING (
    portfolio_id IS NOT NULL
    AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'editor'::portfolio_role_type])
  );

-- 13) Plaid access tokens: REVOKE column-level SELECT from anon/authenticated.
--     PostgREST select('*') silently drops revoked columns. Service role bypasses.
REVOKE SELECT (plaid_access_token) ON public.hap_payee_configs FROM anon, authenticated;
REVOKE SELECT (plaid_access_token) ON public.user_bank_accounts FROM anon, authenticated;
