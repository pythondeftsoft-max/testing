CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  raw_meta jsonb;
  p_role text;
  p_first text;
  p_last text;
  p_phone text;
  p_country text;
  p_state text;
  p_city text;
  p_zip text;
  p_tenant_intent text;
  p_voucher_status text;
  p_housing_authority text;
  p_bedrooms_approved text;
  p_rent_min text;
  p_rent_max text;
  p_move_in text;
  p_credit_score text;
  p_employment text;
  p_income text;
  p_eviction text;
  p_pets text;
  p_felonies text;
  p_accessibility text;
  p_desired_city text;
  p_desired_state text;
  p_desired_zip text;
BEGIN
  raw_meta := new.raw_user_meta_data;

  p_role := COALESCE(raw_meta->>'role', 'tenant');
  p_first := raw_meta->>'first_name';
  p_last := raw_meta->>'last_name';
  p_phone := raw_meta->>'phone';
  p_country := raw_meta->>'country_code';
  p_state := raw_meta->>'tenant_state';
  p_city := raw_meta->>'tenant_city';
  p_zip := raw_meta->>'tenant_zip_code';
  p_tenant_intent := raw_meta->>'tenant_intent';
  p_voucher_status := raw_meta->>'tenant_voucher_status';
  p_housing_authority := raw_meta->>'tenant_housing_authority';
  p_bedrooms_approved := raw_meta->>'tenant_bedrooms_approved';
  p_rent_min := raw_meta->>'tenant_rent_range_min';
  p_rent_max := raw_meta->>'tenant_rent_range_max';
  p_move_in := raw_meta->>'tenant_move_in_window';
  p_credit_score := raw_meta->>'tenant_credit_score_range';
  p_employment := raw_meta->>'tenant_employment_status';
  p_income := raw_meta->>'tenant_monthly_income';
  p_eviction := raw_meta->>'tenant_has_eviction';
  p_pets := raw_meta->>'tenant_has_pets';
  p_felonies := raw_meta->>'tenant_has_felonies';
  p_accessibility := raw_meta->>'tenant_has_accessibility_needs';
  p_desired_city := raw_meta->>'tenant_desired_city';
  p_desired_state := raw_meta->>'tenant_desired_state';
  p_desired_zip := raw_meta->>'tenant_desired_zip_code';

  -- Upsert profile (fixed column names: role->user_type, country_code->preferred_country)
  INSERT INTO public.profiles (id, first_name, last_name, user_type, phone, preferred_country)
  VALUES (new.id, p_first, p_last, p_role, p_phone, p_country)
  ON CONFLICT (id) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    user_type = COALESCE(EXCLUDED.user_type, profiles.user_type),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    preferred_country = COALESCE(EXCLUDED.preferred_country, profiles.preferred_country);

  -- Create tenant profile if role is tenant
  IF p_role = 'tenant' THEN
    INSERT INTO public.tenant_profiles (
      user_id, country_code, state, city, zip_code,
      tenant_intent, voucher_status, housing_authority, bedrooms_approved,
      rent_range_min, rent_range_max, move_in_window, credit_score_range,
      employment_status, monthly_income, has_eviction, has_pets, has_felonies,
      has_accessibility_needs, desired_city, desired_state, desired_zip_code
    ) VALUES (
      new.id, p_country, p_state, p_city, p_zip,
      p_tenant_intent, p_voucher_status, p_housing_authority,
      CASE WHEN p_bedrooms_approved IS NOT NULL AND p_bedrooms_approved ~ '^\d+$' THEN p_bedrooms_approved::integer ELSE NULL END,
      CASE WHEN p_rent_min IS NOT NULL AND p_rent_min ~ '^\d+(\.\d+)?$' THEN p_rent_min::numeric ELSE NULL END,
      CASE WHEN p_rent_max IS NOT NULL AND p_rent_max ~ '^\d+(\.\d+)?$' THEN p_rent_max::numeric ELSE NULL END,
      p_move_in, p_credit_score, p_employment,
      CASE WHEN p_income IS NOT NULL AND p_income ~ '^\d+(\.\d+)?$' THEN p_income::numeric ELSE NULL END,
      CASE WHEN p_eviction IS NOT NULL THEN p_eviction::boolean ELSE NULL END,
      CASE WHEN p_pets IS NOT NULL THEN p_pets::boolean ELSE NULL END,
      CASE WHEN p_felonies IS NOT NULL THEN p_felonies::boolean ELSE NULL END,
      CASE WHEN p_accessibility IS NOT NULL THEN p_accessibility::boolean ELSE NULL END,
      p_desired_city, p_desired_state, p_desired_zip
    )
    ON CONFLICT (user_id) DO UPDATE SET
      country_code = COALESCE(EXCLUDED.country_code, tenant_profiles.country_code),
      state = COALESCE(EXCLUDED.state, tenant_profiles.state),
      city = COALESCE(EXCLUDED.city, tenant_profiles.city),
      zip_code = COALESCE(EXCLUDED.zip_code, tenant_profiles.zip_code),
      tenant_intent = COALESCE(EXCLUDED.tenant_intent, tenant_profiles.tenant_intent),
      voucher_status = COALESCE(EXCLUDED.voucher_status, tenant_profiles.voucher_status),
      housing_authority = COALESCE(EXCLUDED.housing_authority, tenant_profiles.housing_authority),
      bedrooms_approved = COALESCE(EXCLUDED.bedrooms_approved, tenant_profiles.bedrooms_approved),
      rent_range_min = COALESCE(EXCLUDED.rent_range_min, tenant_profiles.rent_range_min),
      rent_range_max = COALESCE(EXCLUDED.rent_range_max, tenant_profiles.rent_range_max),
      move_in_window = COALESCE(EXCLUDED.move_in_window, tenant_profiles.move_in_window),
      credit_score_range = COALESCE(EXCLUDED.credit_score_range, tenant_profiles.credit_score_range),
      employment_status = COALESCE(EXCLUDED.employment_status, tenant_profiles.employment_status),
      monthly_income = COALESCE(EXCLUDED.monthly_income, tenant_profiles.monthly_income),
      has_eviction = COALESCE(EXCLUDED.has_eviction, tenant_profiles.has_eviction),
      has_pets = COALESCE(EXCLUDED.has_pets, tenant_profiles.has_pets),
      has_felonies = COALESCE(EXCLUDED.has_felonies, tenant_profiles.has_felonies),
      has_accessibility_needs = COALESCE(EXCLUDED.has_accessibility_needs, tenant_profiles.has_accessibility_needs),
      desired_city = COALESCE(EXCLUDED.desired_city, tenant_profiles.desired_city),
      desired_state = COALESCE(EXCLUDED.desired_state, tenant_profiles.desired_state),
      desired_zip_code = COALESCE(EXCLUDED.desired_zip_code, tenant_profiles.desired_zip_code);
  END IF;

  RETURN new;
END;
$$;