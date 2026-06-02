-- ========== agency_tenant_links: one row per (user, PHA) relationship ==========
CREATE TABLE IF NOT EXISTS public.agency_tenant_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agency_id uuid NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'applied',
  role text NOT NULL DEFAULT 'head',
  source text NOT NULL DEFAULT 'self_apply_pha',
  application_id uuid REFERENCES public.voucher_applications(id) ON DELETE SET NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, agency_id)
);

CREATE INDEX IF NOT EXISTS idx_atl_agency ON public.agency_tenant_links(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_atl_user ON public.agency_tenant_links(user_id);
CREATE INDEX IF NOT EXISTS idx_atl_merge_pending ON public.agency_tenant_links(user_id) WHERE (metadata ->> 'merge_pending')::boolean IS TRUE;

ALTER TABLE public.agency_tenant_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants read own links" ON public.agency_tenant_links;
CREATE POLICY "Tenants read own links"
  ON public.agency_tenant_links FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Tenants update own links metadata" ON public.agency_tenant_links;
CREATE POLICY "Tenants update own links metadata"
  ON public.agency_tenant_links FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Agency staff read agency links" ON public.agency_tenant_links;
CREATE POLICY "Agency staff read agency links"
  ON public.agency_tenant_links FOR SELECT
  USING (public.is_agency_staff(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Agency staff manage agency links" ON public.agency_tenant_links;
CREATE POLICY "Agency staff manage agency links"
  ON public.agency_tenant_links FOR ALL
  USING (public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

DROP POLICY IF EXISTS "Admins manage all links" ON public.agency_tenant_links;
CREATE POLICY "Admins manage all links"
  ON public.agency_tenant_links FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_agency_tenant_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('waitlisted','applied','active','enrolled','terminated','port_in_pending','port_out','denied','withdrawn') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.role NOT IN ('head','spouse','member','dependent') THEN
    RAISE EXCEPTION 'Invalid role: %', NEW.role;
  END IF;
  IF NEW.source NOT IN ('self_apply_pha','self_apply_marketplace','migrated','manual_invite','port_in','referral') THEN
    RAISE EXCEPTION 'Invalid source: %', NEW.source;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_atl ON public.agency_tenant_links;
CREATE TRIGGER trg_validate_atl
BEFORE INSERT OR UPDATE ON public.agency_tenant_links
FOR EACH ROW EXECUTE FUNCTION public.validate_agency_tenant_link();

-- ========== voucher_applications: claim + back-link columns ==========
ALTER TABLE public.voucher_applications
  ADD COLUMN IF NOT EXISTS tenant_user_id uuid,
  ADD COLUMN IF NOT EXISTS claim_token text,
  ADD COLUMN IF NOT EXISTS claim_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_by uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_va_claim_token ON public.voucher_applications(claim_token) WHERE claim_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_va_tenant_user ON public.voucher_applications(tenant_user_id) WHERE tenant_user_id IS NOT NULL;

-- ========== Helper: find existing auth user by email (used in public edge fn) ==========
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.find_user_by_email(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO service_role;

-- ========== Claim RPC: links applicant row to auth.uid() and creates agency link ==========
CREATE OR REPLACE FUNCTION public.claim_voucher_application(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.voucher_applications%ROWTYPE;
  v_user uuid := auth.uid();
  v_link_status text;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF _token IS NULL OR length(_token) < 16 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_app FROM public.voucher_applications
   WHERE claim_token = _token FOR UPDATE;

  IF v_app.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'token_not_found');
  END IF;
  IF v_app.claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;
  IF v_app.claim_token_expires_at IS NOT NULL AND v_app.claim_token_expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'token_expired');
  END IF;

  -- If applicant already pinned to a different user, refuse
  IF v_app.tenant_user_id IS NOT NULL AND v_app.tenant_user_id <> v_user THEN
    RETURN jsonb_build_object('success', false, 'error', 'application_belongs_to_different_user');
  END IF;

  UPDATE public.voucher_applications
     SET tenant_user_id = v_user,
         claimed_at = now(),
         claim_token = NULL,
         claim_token_expires_at = NULL
   WHERE id = v_app.id;

  v_link_status := CASE
    WHEN v_app.status = 'enrolled' THEN 'active'
    WHEN v_app.intake_mode = 'direct_apply' THEN 'applied'
    ELSE 'waitlisted'
  END;

  INSERT INTO public.agency_tenant_links (user_id, agency_id, status, source, application_id, metadata)
  VALUES (v_user, v_app.agency_id, v_link_status, 'self_apply_pha', v_app.id,
          jsonb_build_object('merge_pending', true, 'claimed_via', 'claim_token'))
  ON CONFLICT (user_id, agency_id) DO UPDATE
    SET application_id = EXCLUDED.application_id,
        status = CASE WHEN public.agency_tenant_links.status = 'terminated' THEN EXCLUDED.status ELSE public.agency_tenant_links.status END,
        metadata = public.agency_tenant_links.metadata || jsonb_build_object('reclaimed_at', now());

  RETURN jsonb_build_object('success', true, 'agency_id', v_app.agency_id, 'application_id', v_app.id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_voucher_application(text) TO authenticated;

-- ========== Enrollment RPC: extend to flag invite-needed when no account yet ==========
CREATE OR REPLACE FUNCTION public.enroll_voucher_application(
  _application_id uuid,
  _voucher_type text DEFAULT 'HCV',
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.voucher_applications%ROWTYPE;
  v_user uuid := auth.uid();
  v_invite_needed boolean := false;
  v_token text;
BEGIN
  SELECT * INTO v_app FROM public.voucher_applications WHERE id = _application_id FOR UPDATE;
  IF v_app.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'application_not_found');
  END IF;
  IF v_app.status = 'enrolled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_enrolled');
  END IF;
  IF v_app.eligibility_status <> 'eligible' THEN
    RETURN jsonb_build_object('success', false, 'error', 'eligibility_not_confirmed', 'eligibility_status', v_app.eligibility_status);
  END IF;

  -- If no account yet, generate (or refresh) a claim token so the next invite email can carry it
  IF v_app.tenant_user_id IS NULL THEN
    v_invite_needed := true;
    v_token := encode(gen_random_bytes(24), 'hex');
    UPDATE public.voucher_applications
       SET claim_token = v_token,
           claim_token_expires_at = now() + interval '30 days',
           invited_at = COALESCE(invited_at, now()),
           invited_by = COALESCE(invited_by, v_user)
     WHERE id = _application_id;
  ELSE
    -- Has an account — ensure agency link exists in active state
    INSERT INTO public.agency_tenant_links (user_id, agency_id, status, source, application_id)
    VALUES (v_app.tenant_user_id, v_app.agency_id, 'active', 'self_apply_pha', v_app.id)
    ON CONFLICT (user_id, agency_id) DO UPDATE SET status = 'active';
  END IF;

  UPDATE public.voucher_applications
     SET status = 'enrolled',
         enrolled_at = now(),
         enrolled_by = v_user,
         notes = COALESCE(NULLIF(_notes,''), notes),
         reviewed_by = COALESCE(reviewed_by, v_user),
         reviewed_at = COALESCE(reviewed_at, now())
   WHERE id = _application_id;

  BEGIN
    INSERT INTO public.agency_audit_log (agency_id, action, entity_type, entity_id, actor_user_id, details)
    VALUES (v_app.agency_id, 'application_enrolled', 'voucher_application', _application_id, v_user,
            jsonb_build_object('voucher_type', _voucher_type, 'intake_mode', v_app.intake_mode, 'invite_needed', v_invite_needed));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'application_id', _application_id,
    'enrolled_at', now(),
    'invite_needed', v_invite_needed,
    'claim_token', v_token
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.enroll_voucher_application(uuid, text, text) TO authenticated;