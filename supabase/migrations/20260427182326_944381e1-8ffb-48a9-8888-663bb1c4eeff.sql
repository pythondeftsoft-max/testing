
-- ============================================================
-- 1. HUD PRIVACY CONSENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hud_privacy_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  applicant_id UUID,
  agency_id UUID,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'hud_9886', 'eiv_consent', 'privacy_act_notice', 'background_check',
    'w9_release', 'credit_check', 'other'
  )),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '3 years'),
  document_url TEXT,
  ip_address INET,
  user_agent TEXT,
  signature_data JSONB DEFAULT '{}'::jsonb,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hud_consents_user ON public.hud_privacy_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_hud_consents_applicant ON public.hud_privacy_consents(applicant_id);
CREATE INDEX IF NOT EXISTS idx_hud_consents_agency ON public.hud_privacy_consents(agency_id);
CREATE INDEX IF NOT EXISTS idx_hud_consents_type ON public.hud_privacy_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_hud_consents_expires ON public.hud_privacy_consents(expires_at) WHERE revoked_at IS NULL;

ALTER TABLE public.hud_privacy_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see their own consents" ON public.hud_privacy_consents;
CREATE POLICY "Users see their own consents" ON public.hud_privacy_consents FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert their own consents" ON public.hud_privacy_consents;
CREATE POLICY "Users insert their own consents" ON public.hud_privacy_consents FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users revoke their own consents" ON public.hud_privacy_consents;
CREATE POLICY "Users revoke their own consents" ON public.hud_privacy_consents FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Agency staff see their agency consents" ON public.hud_privacy_consents;
CREATE POLICY "Agency staff see their agency consents" ON public.hud_privacy_consents FOR SELECT USING (agency_id IS NOT NULL AND public.is_agency_staff(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Admins manage all consents" ON public.hud_privacy_consents;
CREATE POLICY "Admins manage all consents" ON public.hud_privacy_consents FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.has_active_consent(_user_id UUID, _consent_type TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hud_privacy_consents
    WHERE user_id = _user_id AND consent_type = _consent_type
      AND revoked_at IS NULL AND expires_at > now()
  );
$$;

-- ============================================================
-- 2. DATA RETENTION POLICIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  retention_years INTEGER NOT NULL DEFAULT 3 CHECK (retention_years BETWEEN 1 AND 50),
  legal_basis TEXT NOT NULL,
  auto_purge BOOLEAN NOT NULL DEFAULT false,
  purge_strategy TEXT NOT NULL DEFAULT 'anonymize' CHECK (purge_strategy IN ('anonymize', 'soft_delete', 'hard_delete')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage retention policies" ON public.data_retention_policies;
CREATE POLICY "Admins manage retention policies" ON public.data_retention_policies FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Agency staff view retention policies" ON public.data_retention_policies;
CREATE POLICY "Agency staff view retention policies" ON public.data_retention_policies FOR SELECT USING (auth.uid() IS NOT NULL);

INSERT INTO public.data_retention_policies (record_type, display_name, retention_years, legal_basis, auto_purge, purge_strategy) VALUES
  ('tenant_files', 'Tenant Files (post-termination)', 3, '24 CFR 908.101', false, 'anonymize'),
  ('hap_records', 'HAP Payment Records', 3, '24 CFR 982.158', false, 'anonymize'),
  ('inspection_reports', 'HQS/NSPIRE Inspection Reports', 3, '24 CFR 982.158', false, 'anonymize'),
  ('applications', 'Voucher Applications (rejected)', 3, '24 CFR 960.259', false, 'anonymize'),
  ('eiv_data', 'EIV Income Verification Data', 3, '24 CFR 5.212', true, 'hard_delete'),
  ('communications', 'Tenant/Landlord Communications', 3, 'HUD recordkeeping', false, 'anonymize'),
  ('financial_records', 'Financial / NACHA Records', 7, 'IRS retention', false, 'soft_delete'),
  ('grievance_records', 'Grievance & Hearing Records', 5, '24 CFR 966.50', false, 'soft_delete'),
  ('background_checks', 'Background Check Results', 3, 'FCRA / HUD', true, 'hard_delete')
ON CONFLICT (record_type) DO NOTHING;

-- ============================================================
-- 3. RETENTION PURGE LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.retention_purge_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.data_retention_policies(id),
  record_type TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('anonymized', 'soft_deleted', 'hard_deleted', 'skipped_legal_hold', 'dry_run')),
  reason TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_purge_log_record ON public.retention_purge_log(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_purge_log_executed_at ON public.retention_purge_log(executed_at DESC);

ALTER TABLE public.retention_purge_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view purge log" ON public.retention_purge_log;
CREATE POLICY "Admins view purge log" ON public.retention_purge_log FOR SELECT USING (public.is_admin(auth.uid()));

-- ============================================================
-- 4. LEGAL HOLDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  hold_reason TEXT NOT NULL,
  case_reference TEXT,
  placed_by UUID NOT NULL,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_by UUID,
  released_at TIMESTAMPTZ,
  release_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_legal_holds_record ON public.legal_holds(record_type, record_id) WHERE released_at IS NULL;

ALTER TABLE public.legal_holds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage legal holds" ON public.legal_holds;
CREATE POLICY "Admins manage legal holds" ON public.legal_holds FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.is_legally_held(_record_type TEXT, _record_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.legal_holds
    WHERE record_type = _record_type AND record_id = _record_id AND released_at IS NULL
  );
$$;

-- ============================================================
-- 5. DSAR REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dsar_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID NOT NULL,
  requester_role TEXT NOT NULL CHECK (requester_role IN ('tenant', 'landlord', 'applicant', 'other')),
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'deletion', 'correction')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'in_review', 'pending_legal_review', 'fulfilled', 'denied', 'cancelled'
  )),
  details TEXT,
  agency_id UUID,
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by UUID,
  export_url TEXT,
  export_expires_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dsar_requester ON public.dsar_requests(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_dsar_status ON public.dsar_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsar_agency ON public.dsar_requests(agency_id);

ALTER TABLE public.dsar_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see their own DSAR" ON public.dsar_requests;
CREATE POLICY "Users see their own DSAR" ON public.dsar_requests FOR SELECT USING (requester_user_id = auth.uid());
DROP POLICY IF EXISTS "Users create their own DSAR" ON public.dsar_requests;
CREATE POLICY "Users create their own DSAR" ON public.dsar_requests FOR INSERT WITH CHECK (requester_user_id = auth.uid());
DROP POLICY IF EXISTS "Agency staff see their agency DSAR" ON public.dsar_requests;
CREATE POLICY "Agency staff see their agency DSAR" ON public.dsar_requests FOR SELECT USING (agency_id IS NOT NULL AND public.is_agency_staff(auth.uid(), agency_id));
DROP POLICY IF EXISTS "Admins manage all DSAR" ON public.dsar_requests;
CREATE POLICY "Admins manage all DSAR" ON public.dsar_requests FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- 6. VAWA CERTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vawa_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agency_id UUID,
  certification_type TEXT NOT NULL DEFAULT 'hud_5382' CHECK (certification_type IN ('hud_5382', 'court_order', 'third_party', 'self_cert')),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  document_url TEXT,
  ip_address INET,
  signature_data JSONB DEFAULT '{}'::jsonb,
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vawa_cert_user_active ON public.vawa_certifications(user_id) WHERE revoked_at IS NULL;

ALTER TABLE public.vawa_certifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see their own VAWA cert" ON public.vawa_certifications;
CREATE POLICY "Users see their own VAWA cert" ON public.vawa_certifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users create their own VAWA cert" ON public.vawa_certifications;
CREATE POLICY "Users create their own VAWA cert" ON public.vawa_certifications FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins manage all VAWA" ON public.vawa_certifications;
CREATE POLICY "Admins manage all VAWA" ON public.vawa_certifications FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Agency staff see their agency VAWA" ON public.vawa_certifications;
CREATE POLICY "Agency staff see their agency VAWA" ON public.vawa_certifications FOR SELECT USING (agency_id IS NOT NULL AND public.is_agency_staff(auth.uid(), agency_id));

CREATE OR REPLACE FUNCTION public.is_vawa_protected(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vawa_certifications
    WHERE user_id = _user_id AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.mask_vawa_location(_user_id UUID, _address TEXT, _viewer_id UUID DEFAULT auth.uid())
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_vawa_protected(_user_id) THEN RETURN _address; END IF;
  IF _viewer_id = _user_id THEN RETURN _address; END IF;
  IF public.is_admin(_viewer_id) THEN RETURN _address; END IF;
  RETURN '[VAWA PROTECTED]';
END;
$$;

-- ============================================================
-- 7. SECURITY INCIDENTS — extend existing table additively
-- ============================================================
ALTER TABLE public.security_incidents
  ADD COLUMN IF NOT EXISTS discovered_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS contained_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS affected_user_ids UUID[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS affected_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pii_exposed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pii_types TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS remediation TEXT,
  ADD COLUMN IF NOT EXISTS breach_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hud_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_method TEXT,
  ADD COLUMN IF NOT EXISTS reporter_id UUID,
  ADD COLUMN IF NOT EXISTS source TEXT;

-- ============================================================
-- 8. EIV ACCESS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.eiv_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  subject_user_id UUID,
  subject_applicant_id UUID,
  agency_id UUID,
  action TEXT NOT NULL CHECK (action IN ('view', 'export', 'print', 'verify')),
  field_accessed TEXT,
  purpose TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eiv_log_actor ON public.eiv_access_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eiv_log_subject ON public.eiv_access_log(subject_user_id);
CREATE INDEX IF NOT EXISTS idx_eiv_log_agency ON public.eiv_access_log(agency_id);

ALTER TABLE public.eiv_access_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view EIV log" ON public.eiv_access_log;
CREATE POLICY "Admins view EIV log" ON public.eiv_access_log FOR SELECT USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Agency staff view their EIV log" ON public.eiv_access_log;
CREATE POLICY "Agency staff view their EIV log" ON public.eiv_access_log FOR SELECT USING (agency_id IS NOT NULL AND public.is_agency_staff(auth.uid(), agency_id));
DROP POLICY IF EXISTS "Authenticated insert EIV log" ON public.eiv_access_log;
CREATE POLICY "Authenticated insert EIV log" ON public.eiv_access_log FOR INSERT WITH CHECK (actor_id = auth.uid());

-- ============================================================
-- 9. updated_at triggers
-- ============================================================
DROP TRIGGER IF EXISTS trg_hud_consents_updated ON public.hud_privacy_consents;
CREATE TRIGGER trg_hud_consents_updated BEFORE UPDATE ON public.hud_privacy_consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_retention_policies_updated ON public.data_retention_policies;
CREATE TRIGGER trg_retention_policies_updated BEFORE UPDATE ON public.data_retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_legal_holds_updated ON public.legal_holds;
CREATE TRIGGER trg_legal_holds_updated BEFORE UPDATE ON public.legal_holds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_dsar_updated ON public.dsar_requests;
CREATE TRIGGER trg_dsar_updated BEFORE UPDATE ON public.dsar_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_vawa_updated ON public.vawa_certifications;
CREATE TRIGGER trg_vawa_updated BEFORE UPDATE ON public.vawa_certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
