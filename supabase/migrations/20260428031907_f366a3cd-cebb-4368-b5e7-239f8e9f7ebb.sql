-- ========== Voucher application review workflow ==========
ALTER TABLE public.voucher_applications
  ADD COLUMN IF NOT EXISTS intake_mode text NOT NULL DEFAULT 'waitlist',
  ADD COLUMN IF NOT EXISTS eligibility_status text NOT NULL DEFAULT 'unscreened',
  ADD COLUMN IF NOT EXISTS interview_scheduled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS interview_completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS interview_notes text,
  ADD COLUMN IF NOT EXISTS documents_requested text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS documents_received text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS denial_reason text,
  ADD COLUMN IF NOT EXISTS denial_letter_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS enrolled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS enrolled_by uuid;

CREATE OR REPLACE FUNCTION public.validate_voucher_application_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.intake_mode NOT IN ('waitlist','direct_apply','transfer_in','referral') THEN
    RAISE EXCEPTION 'Invalid intake_mode: %', NEW.intake_mode;
  END IF;
  IF NEW.eligibility_status NOT IN ('unscreened','eligible','ineligible','needs_info') THEN
    RAISE EXCEPTION 'Invalid eligibility_status: %', NEW.eligibility_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_va_workflow ON public.voucher_applications;
CREATE TRIGGER trg_validate_va_workflow
BEFORE INSERT OR UPDATE OF intake_mode, eligibility_status ON public.voucher_applications
FOR EACH ROW EXECUTE FUNCTION public.validate_voucher_application_workflow();

-- ========== Housing authority direct-apply mode + HAP block setting ==========
ALTER TABLE public.housing_authorities
  ADD COLUMN IF NOT EXISTS direct_apply_open boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS direct_apply_message text,
  ADD COLUMN IF NOT EXISTS direct_apply_intake_modes text[] DEFAULT ARRAY['referral']::text[],
  ADD COLUMN IF NOT EXISTS direct_apply_eligibility_criteria jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hap_block_unready_landlords boolean NOT NULL DEFAULT false;

-- ========== Landlord pay-ready gate ==========
ALTER TABLE public.agency_landlords
  ADD COLUMN IF NOT EXISTS pay_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pay_ready_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS pay_ready_by uuid,
  ADD COLUMN IF NOT EXISTS pay_hold_reason text;

-- ========== Live pay-ready checklist ==========
CREATE OR REPLACE FUNCTION public.is_landlord_pay_ready(_landlord_id uuid)
RETURNS TABLE(
  ready boolean,
  w9_ok boolean,
  payee_ok boolean,
  bank_ok boolean,
  contract_ok boolean,
  insurance_ok boolean,
  details jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord public.agency_landlords%ROWTYPE;
  v_w9 boolean := false;
  v_payee boolean := false;
  v_bank boolean := false;
  v_contract boolean := false;
  v_insurance boolean := true;
BEGIN
  SELECT * INTO v_landlord FROM public.agency_landlords WHERE id = _landlord_id;
  IF v_landlord.id IS NULL THEN
    RETURN QUERY SELECT false, false, false, false, false, false, '{"error":"landlord_not_found"}'::jsonb;
    RETURN;
  END IF;

  v_w9 := COALESCE(v_landlord.w9_status::text = 'approved', false);

  IF v_landlord.landlord_id IS NOT NULL THEN
    SELECT
      EXISTS (SELECT 1 FROM public.landlord_payout_profiles p WHERE p.landlord_id = v_landlord.landlord_id AND p.is_active = true),
      EXISTS (SELECT 1 FROM public.landlord_payout_profiles p WHERE p.landlord_id = v_landlord.landlord_id AND p.is_active = true AND p.bank_verified = true)
    INTO v_payee, v_bank;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='agency_hap_contracts') THEN
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM public.agency_hap_contracts WHERE agency_id = %L AND landlord_id = %L AND status::text IN (''active'',''executed''))',
      v_landlord.agency_id, v_landlord.landlord_id
    ) INTO v_contract;
  END IF;

  RETURN QUERY SELECT
    (v_w9 AND v_payee AND v_bank AND v_contract AND v_insurance) AS ready,
    v_w9, v_payee, v_bank, v_contract, v_insurance,
    jsonb_build_object(
      'w9_status', v_landlord.w9_status,
      'pay_hold_reason', v_landlord.pay_hold_reason,
      'pay_ready_flag', v_landlord.pay_ready
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_landlord_pay_ready(uuid) TO authenticated;

-- ========== Application enrollment helper ==========
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
            jsonb_build_object('voucher_type', _voucher_type, 'intake_mode', v_app.intake_mode));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('success', true, 'application_id', _application_id, 'enrolled_at', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.enroll_voucher_application(uuid, text, text) TO authenticated;

-- ========== Indexes ==========
CREATE INDEX IF NOT EXISTS idx_va_intake_mode ON public.voucher_applications(agency_id, intake_mode);
CREATE INDEX IF NOT EXISTS idx_va_eligibility ON public.voucher_applications(agency_id, eligibility_status);
CREATE INDEX IF NOT EXISTS idx_al_pay_ready   ON public.agency_landlords(agency_id, pay_ready);