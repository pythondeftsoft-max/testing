-- Make handle_new_user resilient so a single bad value (or a missing
-- tenant_profiles column on this DB) can no longer abort the auth
-- transaction and surface as "Database error saving new user (500)".
--
-- Strategy:
--   * Keep the public.profiles insert mandatory (the app cannot work
--     without it).
--   * Wrap the public.tenant_profiles insert in a BEGIN/EXCEPTION so any
--     cast failure, schema drift, or constraint error is logged via
--     RAISE WARNING but does not roll back auth.users insert.
--   * Guard numeric / boolean / jsonb-array casts against malformed input.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_meta jsonb;
  v_role text;
  v_first_name text;
  v_last_name text;
  v_intent text;
  v_ha_id uuid;
  v_user_type public.user_type;
  v_phone text;
  v_voucher_amount numeric;
  v_rent_min numeric;
  v_rent_max numeric;
  v_bedrooms text[];
  v_has_eviction boolean;
  v_has_felonies boolean;
  v_has_pets boolean;
  v_has_access boolean;
  v_sms_consent boolean;
BEGIN
  raw_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  v_first_name := COALESCE(raw_meta->>'first_name', '');
  v_last_name  := COALESCE(raw_meta->>'last_name', '');
  v_phone      := raw_meta->>'phone';

  v_role := COALESCE(raw_meta->>'user_type', raw_meta->>'role', 'tenant');

  v_user_type := CASE
    WHEN v_role = 'landlord' THEN 'landlord'::public.user_type
    WHEN v_role = 'property_manager' THEN 'property_manager'::public.user_type
    WHEN v_role = 'agency' THEN 'agency'::public.user_type
    WHEN v_role = 'admin' THEN 'admin'::public.user_type
    WHEN v_role = 'market_tenant' THEN 'market_tenant'::public.user_type
    ELSE 'tenant'::public.user_type
  END;

  -- profiles is required for the app to function — let any failure here
  -- bubble up so the user can see and retry.
  INSERT INTO public.profiles (id, first_name, last_name, email, user_type, phone)
  VALUES (NEW.id, v_first_name, v_last_name, COALESCE(NEW.email, ''), v_user_type, v_phone)
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    user_type = EXCLUDED.user_type,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  IF v_role <> 'tenant' THEN
    RETURN NEW;
  END IF;

  -- Tenant-only metadata. Everything below is best-effort; any failure
  -- must not abort the auth transaction.
  BEGIN
    v_intent := COALESCE(raw_meta->>'tenant_intent', 'housing_seeker');

    v_ha_id := NULL;
    IF NULLIF(raw_meta->>'tenant_housing_authority_id', '') IS NOT NULL THEN
      BEGIN
        v_ha_id := (raw_meta->>'tenant_housing_authority_id')::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_ha_id := NULL;
      END;
    END IF;

    -- Safe numeric / boolean coercions
    BEGIN
      v_voucher_amount := NULLIF(raw_meta->>'voucher_amount', '')::numeric;
    EXCEPTION WHEN OTHERS THEN v_voucher_amount := NULL; END;

    BEGIN
      v_rent_min := NULLIF(raw_meta->>'tenant_rent_range_min', '')::numeric;
    EXCEPTION WHEN OTHERS THEN v_rent_min := NULL; END;

    BEGIN
      v_rent_max := NULLIF(raw_meta->>'tenant_rent_range_max', '')::numeric;
    EXCEPTION WHEN OTHERS THEN v_rent_max := NULL; END;

    BEGIN
      v_has_eviction := COALESCE((raw_meta->>'tenant_has_eviction')::boolean, false);
    EXCEPTION WHEN OTHERS THEN v_has_eviction := false; END;

    BEGIN
      v_has_felonies := COALESCE((raw_meta->>'tenant_has_felonies')::boolean, false);
    EXCEPTION WHEN OTHERS THEN v_has_felonies := false; END;

    BEGIN
      v_has_pets := COALESCE((raw_meta->>'tenant_has_pets')::boolean, false);
    EXCEPTION WHEN OTHERS THEN v_has_pets := false; END;

    BEGIN
      v_has_access := COALESCE((raw_meta->>'tenant_has_accessibility_needs')::boolean, false);
    EXCEPTION WHEN OTHERS THEN v_has_access := false; END;

    BEGIN
      v_sms_consent := COALESCE((raw_meta->>'sms_consent')::boolean, false);
    EXCEPTION WHEN OTHERS THEN v_sms_consent := false; END;

    -- bedrooms_approved must be a JSON array; tolerate anything else.
    v_bedrooms := NULL;
    BEGIN
      IF jsonb_typeof(raw_meta->'tenant_bedrooms_approved') = 'array' THEN
        v_bedrooms := ARRAY(SELECT jsonb_array_elements_text(raw_meta->'tenant_bedrooms_approved'));
      END IF;
    EXCEPTION WHEN OTHERS THEN v_bedrooms := NULL; END;

    INSERT INTO public.tenant_profiles (
      user_id, country_code, state, city, zip_code,
      desired_state, desired_city, desired_zip_code,
      voucher_holder, voucher_amount, voucher_status,
      bedrooms_approved, rent_range_min, rent_range_max,
      move_in_window, credit_score_range, employment_status, monthly_income,
      has_eviction, eviction_details,
      has_felonies, felony_details,
      has_pets, pet_type,
      has_accessibility_needs, accessibility_details,
      sms_consent, tenant_intent, current_address,
      housing_authority_id, housing_authority, signup_notes,
      phone, phone_type
    ) VALUES (
      NEW.id,
      COALESCE(raw_meta->>'tenant_country_code', 'US'),
      COALESCE(raw_meta->>'tenant_state', ''),
      COALESCE(raw_meta->>'tenant_city', ''),
      COALESCE(raw_meta->>'tenant_zip_code', ''),
      COALESCE(raw_meta->>'tenant_desired_state', ''),
      COALESCE(raw_meta->>'tenant_desired_city', ''),
      COALESCE(raw_meta->>'tenant_desired_zip_code', ''),
      COALESCE(NULLIF(raw_meta->>'tenant_voucher_status','') = 'yes', false),
      v_voucher_amount,
      raw_meta->>'tenant_voucher_status',
      v_bedrooms,
      v_rent_min,
      v_rent_max,
      raw_meta->>'tenant_move_in_window',
      raw_meta->>'tenant_credit_score_range',
      raw_meta->>'tenant_employment_status',
      raw_meta->>'tenant_monthly_income',
      v_has_eviction,
      raw_meta->>'tenant_eviction_details',
      v_has_felonies,
      raw_meta->>'tenant_felony_details',
      v_has_pets,
      raw_meta->>'tenant_pet_type',
      v_has_access,
      raw_meta->>'tenant_accessibility_details',
      v_sms_consent,
      v_intent,
      COALESCE(raw_meta->>'tenant_current_address', ''),
      v_ha_id,
      raw_meta->>'tenant_housing_authority',
      raw_meta->>'tenant_signup_notes',
      v_phone,
      raw_meta->>'tenant_phone_type'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      country_code = EXCLUDED.country_code,
      state = EXCLUDED.state,
      city = EXCLUDED.city,
      zip_code = EXCLUDED.zip_code,
      desired_state = EXCLUDED.desired_state,
      desired_city = EXCLUDED.desired_city,
      desired_zip_code = EXCLUDED.desired_zip_code,
      voucher_holder = EXCLUDED.voucher_holder,
      voucher_amount = EXCLUDED.voucher_amount,
      voucher_status = EXCLUDED.voucher_status,
      bedrooms_approved = EXCLUDED.bedrooms_approved,
      rent_range_min = EXCLUDED.rent_range_min,
      rent_range_max = EXCLUDED.rent_range_max,
      move_in_window = EXCLUDED.move_in_window,
      credit_score_range = EXCLUDED.credit_score_range,
      employment_status = EXCLUDED.employment_status,
      monthly_income = EXCLUDED.monthly_income,
      has_eviction = EXCLUDED.has_eviction,
      eviction_details = EXCLUDED.eviction_details,
      has_felonies = EXCLUDED.has_felonies,
      felony_details = EXCLUDED.felony_details,
      has_pets = EXCLUDED.has_pets,
      pet_type = EXCLUDED.pet_type,
      has_accessibility_needs = EXCLUDED.has_accessibility_needs,
      accessibility_details = EXCLUDED.accessibility_details,
      sms_consent = EXCLUDED.sms_consent,
      tenant_intent = EXCLUDED.tenant_intent,
      current_address = EXCLUDED.current_address,
      housing_authority_id = EXCLUDED.housing_authority_id,
      housing_authority = EXCLUDED.housing_authority,
      signup_notes = EXCLUDED.signup_notes,
      phone = COALESCE(EXCLUDED.phone, public.tenant_profiles.phone),
      phone_type = COALESCE(EXCLUDED.phone_type, public.tenant_profiles.phone_type);

  EXCEPTION WHEN OTHERS THEN
    -- Never block auth user creation on tenant_profiles failure.
    -- The row can be backfilled later from raw_user_meta_data.
    RAISE WARNING 'handle_new_user: tenant_profiles insert failed for %: % / %',
      NEW.id, SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
