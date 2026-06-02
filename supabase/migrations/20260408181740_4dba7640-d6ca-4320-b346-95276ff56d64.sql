
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  raw_meta jsonb;
  v_role text;
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_intent text;
  v_ha_id uuid;
  v_user_type public.user_type;
BEGIN
  raw_meta := NEW.raw_user_meta_data;
  v_role := COALESCE(raw_meta->>'role', 'tenant');
  v_full_name := COALESCE(raw_meta->>'full_name', raw_meta->>'name', '');

  -- Split full_name into first/last
  v_first_name := split_part(v_full_name, ' ', 1);
  v_last_name := CASE
    WHEN position(' ' in v_full_name) > 0
    THEN substring(v_full_name from position(' ' in v_full_name) + 1)
    ELSE ''
  END;

  -- Map role string to user_type enum
  v_user_type := CASE
    WHEN v_role = 'landlord' THEN 'landlord'::public.user_type
    WHEN v_role = 'property_manager' THEN 'property_manager'::public.user_type
    WHEN v_role = 'agency' THEN 'agency'::public.user_type
    WHEN v_role = 'admin' THEN 'admin'::public.user_type
    WHEN v_role = 'market_tenant' THEN 'market_tenant'::public.user_type
    ELSE 'tenant'::public.user_type
  END;

  v_intent := COALESCE(raw_meta->>'tenant_intent', 'housing_seeker');

  -- Resolve housing authority ID from metadata (may be null)
  v_ha_id := NULL;
  IF raw_meta->>'tenant_housing_authority_id' IS NOT NULL AND raw_meta->>'tenant_housing_authority_id' != '' THEN
    v_ha_id := (raw_meta->>'tenant_housing_authority_id')::uuid;
  END IF;

  -- Create profile using correct column names
  INSERT INTO public.profiles (id, first_name, last_name, email, user_type)
  VALUES (NEW.id, v_first_name, v_last_name, COALESCE(NEW.email, ''), v_user_type)
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    user_type = EXCLUDED.user_type;

  -- Create tenant profile if role is tenant
  IF v_role = 'tenant' THEN
    INSERT INTO public.tenant_profiles (
      user_id, full_name, email, phone,
      country_code, state, city, zip_code,
      desired_state, desired_city, desired_zip_code,
      has_voucher, voucher_amount,
      move_in_timeline, num_bedrooms,
      has_eviction_history, has_felony_history,
      has_pets, needs_accessibility,
      sms_consent, sms_consent_timestamp,
      intent, current_address,
      housing_authority_id
    ) VALUES (
      NEW.id,
      v_full_name,
      COALESCE(NEW.email, ''),
      COALESCE(raw_meta->>'phone', ''),
      COALESCE(raw_meta->>'country_code', 'US'),
      COALESCE(raw_meta->>'tenant_state', ''),
      COALESCE(raw_meta->>'tenant_city', ''),
      COALESCE(raw_meta->>'tenant_zip_code', ''),
      COALESCE(raw_meta->>'tenant_desired_state', ''),
      COALESCE(raw_meta->>'tenant_desired_city', ''),
      COALESCE(raw_meta->>'tenant_desired_zip_code', ''),
      COALESCE((raw_meta->>'has_voucher')::boolean, false),
      CASE WHEN raw_meta->>'voucher_amount' IS NOT NULL AND raw_meta->>'voucher_amount' != ''
           THEN (raw_meta->>'voucher_amount')::numeric ELSE NULL END,
      COALESCE(raw_meta->>'move_in_timeline', ''),
      CASE WHEN raw_meta->>'num_bedrooms' IS NOT NULL AND raw_meta->>'num_bedrooms' != ''
           THEN (raw_meta->>'num_bedrooms')::integer ELSE NULL END,
      COALESCE((raw_meta->>'has_eviction_history')::boolean, false),
      COALESCE((raw_meta->>'has_felony_history')::boolean, false),
      COALESCE((raw_meta->>'has_pets')::boolean, false),
      COALESCE((raw_meta->>'needs_accessibility')::boolean, false),
      COALESCE((raw_meta->>'sms_consent')::boolean, false),
      CASE WHEN (raw_meta->>'sms_consent')::boolean = true THEN now() ELSE NULL END,
      v_intent,
      COALESCE(raw_meta->>'tenant_current_address', ''),
      v_ha_id
    )
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      country_code = EXCLUDED.country_code,
      state = EXCLUDED.state,
      city = EXCLUDED.city,
      zip_code = EXCLUDED.zip_code,
      desired_state = EXCLUDED.desired_state,
      desired_city = EXCLUDED.desired_city,
      desired_zip_code = EXCLUDED.desired_zip_code,
      has_voucher = EXCLUDED.has_voucher,
      voucher_amount = EXCLUDED.voucher_amount,
      move_in_timeline = EXCLUDED.move_in_timeline,
      num_bedrooms = EXCLUDED.num_bedrooms,
      has_eviction_history = EXCLUDED.has_eviction_history,
      has_felony_history = EXCLUDED.has_felony_history,
      has_pets = EXCLUDED.has_pets,
      needs_accessibility = EXCLUDED.needs_accessibility,
      sms_consent = EXCLUDED.sms_consent,
      sms_consent_timestamp = EXCLUDED.sms_consent_timestamp,
      intent = EXCLUDED.intent,
      current_address = EXCLUDED.current_address,
      housing_authority_id = EXCLUDED.housing_authority_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
