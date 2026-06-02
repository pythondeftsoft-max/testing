
-- Add phone and phone_type columns to tenant_profiles
ALTER TABLE public.tenant_profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS phone_type text;

-- Update handle_new_user to extract and save phone
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
BEGIN
  raw_meta := NEW.raw_user_meta_data;

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

  v_intent := COALESCE(raw_meta->>'tenant_intent', 'housing_seeker');

  v_ha_id := NULL;
  IF raw_meta->>'tenant_housing_authority_id' IS NOT NULL AND raw_meta->>'tenant_housing_authority_id' != '' THEN
    BEGIN
      v_ha_id := (raw_meta->>'tenant_housing_authority_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_ha_id := NULL;
    END;
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, email, user_type, phone)
  VALUES (NEW.id, v_first_name, v_last_name, COALESCE(NEW.email, ''), v_user_type, v_phone)
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    user_type = EXCLUDED.user_type,
    phone = COALESCE(EXCLUDED.phone, profiles.phone);

  IF v_role = 'tenant' THEN
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
      COALESCE((raw_meta->>'tenant_voucher_status') = 'yes', false),
      CASE WHEN raw_meta->>'voucher_amount' IS NOT NULL AND raw_meta->>'voucher_amount' != ''
           THEN (raw_meta->>'voucher_amount')::numeric ELSE NULL END,
      raw_meta->>'tenant_voucher_status',
      CASE WHEN raw_meta->>'tenant_bedrooms_approved' IS NOT NULL
           THEN ARRAY(SELECT jsonb_array_elements_text(raw_meta->'tenant_bedrooms_approved'))
           ELSE NULL END,
      CASE WHEN raw_meta->>'tenant_rent_range_min' IS NOT NULL AND raw_meta->>'tenant_rent_range_min' != ''
           THEN (raw_meta->>'tenant_rent_range_min')::numeric ELSE NULL END,
      CASE WHEN raw_meta->>'tenant_rent_range_max' IS NOT NULL AND raw_meta->>'tenant_rent_range_max' != ''
           THEN (raw_meta->>'tenant_rent_range_max')::numeric ELSE NULL END,
      raw_meta->>'tenant_move_in_window',
      raw_meta->>'tenant_credit_score_range',
      raw_meta->>'tenant_employment_status',
      raw_meta->>'tenant_monthly_income',
      COALESCE((raw_meta->>'tenant_has_eviction')::boolean, false),
      raw_meta->>'tenant_eviction_details',
      COALESCE((raw_meta->>'tenant_has_felonies')::boolean, false),
      raw_meta->>'tenant_felony_details',
      COALESCE((raw_meta->>'tenant_has_pets')::boolean, false),
      raw_meta->>'tenant_pet_type',
      COALESCE((raw_meta->>'tenant_has_accessibility_needs')::boolean, false),
      raw_meta->>'tenant_accessibility_details',
      COALESCE((raw_meta->>'sms_consent')::boolean, false),
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
      phone = COALESCE(EXCLUDED.phone, tenant_profiles.phone),
      phone_type = COALESCE(EXCLUDED.phone_type, tenant_profiles.phone_type);
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill profiles.phone from auth.users metadata where missing
UPDATE public.profiles p
SET phone = u.raw_user_meta_data->>'phone'
FROM auth.users u
WHERE p.id = u.id
  AND (p.phone IS NULL OR p.phone = '')
  AND u.raw_user_meta_data->>'phone' IS NOT NULL
  AND u.raw_user_meta_data->>'phone' != '';

-- Backfill tenant_profiles.phone and phone_type from auth.users metadata where missing
UPDATE public.tenant_profiles tp
SET 
  phone = COALESCE(u.raw_user_meta_data->>'phone', tp.phone),
  phone_type = COALESCE(u.raw_user_meta_data->>'tenant_phone_type', tp.phone_type)
FROM auth.users u
WHERE tp.user_id = u.id
  AND (tp.phone IS NULL OR tp.phone = '')
  AND u.raw_user_meta_data->>'phone' IS NOT NULL
  AND u.raw_user_meta_data->>'phone' != '';
