
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
  v_user_type text;
  v_first_name text;
  v_last_name text;
  v_company_name text;
  v_phone text;
  v_phone_type text;
  v_country_code text;
  v_state text;
  v_city text;
  v_zip_code text;
  v_voucher_status text;
  v_housing_authority text;
  v_bedrooms_approved text[];
  v_rent_range_min text;
  v_rent_range_max text;
  v_move_in_window text;
  v_credit_score_range text;
  v_employment_status text;
  v_monthly_income text;
  v_has_eviction boolean;
  v_eviction_details text;
  v_has_pets boolean;
  v_pet_type text;
  v_has_felonies boolean;
  v_felony_details text;
  v_has_accessibility_needs boolean;
  v_accessibility_details text;
  v_signup_notes text;
  v_current_rent_portion text;
  v_tenant_intent text;
  v_seo_source text;
  v_seo_template_type text;
  v_seo_city text;
  v_seo_state text;
  v_seo_page_url text;
  v_sms_consent boolean;
  v_desired_city text;
  v_desired_state text;
  v_desired_zip_code text;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  v_user_type := COALESCE(meta->>'user_type', 'tenant');
  v_first_name := meta->>'first_name';
  v_last_name := meta->>'last_name';
  v_company_name := meta->>'company_name';
  v_phone := meta->>'phone';
  v_phone_type := meta->>'tenant_phone_type';
  v_country_code := COALESCE(meta->>'tenant_country_code', 'US');
  v_state := meta->>'tenant_state';
  v_city := meta->>'tenant_city';
  v_zip_code := meta->>'tenant_zip_code';
  v_voucher_status := meta->>'tenant_voucher_status';
  v_housing_authority := meta->>'tenant_housing_authority';
  v_rent_range_min := meta->>'tenant_rent_range_min';
  v_rent_range_max := meta->>'tenant_rent_range_max';
  v_move_in_window := meta->>'tenant_move_in_window';
  v_credit_score_range := meta->>'tenant_credit_score_range';
  v_employment_status := meta->>'tenant_employment_status';
  v_monthly_income := meta->>'tenant_monthly_income';
  v_has_eviction := COALESCE((meta->>'tenant_has_eviction')::boolean, false);
  v_eviction_details := meta->>'tenant_eviction_details';
  v_has_pets := COALESCE((meta->>'tenant_has_pets')::boolean, false);
  v_pet_type := meta->>'tenant_pet_type';
  v_has_felonies := COALESCE((meta->>'tenant_has_felonies')::boolean, false);
  v_felony_details := meta->>'tenant_felony_details';
  v_has_accessibility_needs := COALESCE((meta->>'tenant_has_accessibility_needs')::boolean, false);
  v_accessibility_details := meta->>'tenant_accessibility_details';
  v_signup_notes := meta->>'tenant_signup_notes';
  v_current_rent_portion := meta->>'tenant_current_rent_portion';

  v_tenant_intent := COALESCE(meta->>'tenant_intent', 'housing_seeker');
  v_seo_source := meta->>'seo_source';
  v_seo_template_type := meta->>'seo_template_type';
  v_seo_city := meta->>'seo_city';
  v_seo_state := meta->>'seo_state';
  v_seo_page_url := meta->>'seo_page_url';
  v_sms_consent := COALESCE((meta->>'tenant_sms_consent')::boolean, false);

  v_desired_city := meta->>'tenant_desired_city';
  v_desired_state := meta->>'tenant_desired_state';
  v_desired_zip_code := meta->>'tenant_desired_zip_code';

  IF meta->'tenant_bedrooms_approved' IS NOT NULL AND jsonb_typeof(meta->'tenant_bedrooms_approved') = 'array' THEN
    SELECT array_agg(elem::text) INTO v_bedrooms_approved
    FROM jsonb_array_elements_text(meta->'tenant_bedrooms_approved') AS elem;
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, company_name, phone, user_type)
  VALUES (
    NEW.id,
    v_first_name,
    v_last_name,
    v_company_name,
    v_phone,
    v_user_type::public.user_type
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    user_type = COALESCE(EXCLUDED.user_type, profiles.user_type),
    updated_at = now();

  IF v_user_type = 'tenant' THEN
    INSERT INTO public.tenant_profiles (
      user_id,
      phone_type,
      country_code,
      state,
      city,
      zip_code,
      voucher_status,
      housing_authority,
      bedrooms_approved,
      rent_range_min,
      rent_range_max,
      move_in_window,
      credit_score_range,
      employment_status,
      monthly_income,
      has_eviction,
      eviction_details,
      has_pets,
      pet_type,
      has_felonies,
      felony_details,
      has_accessibility_needs,
      accessibility_details,
      signup_notes,
      current_rent_portion,
      tenant_intent,
      seo_source,
      seo_template_type,
      seo_city,
      seo_state,
      seo_page_url,
      sms_consent,
      desired_city,
      desired_state,
      desired_zip_code
    ) VALUES (
      NEW.id,
      v_phone_type,
      v_country_code,
      v_state,
      v_city,
      v_zip_code,
      v_voucher_status,
      v_housing_authority,
      v_bedrooms_approved,
      CASE WHEN v_rent_range_min IS NOT NULL AND v_rent_range_min ~ '^\d+(\.\d+)?$'
           THEN v_rent_range_min::numeric ELSE NULL END,
      CASE WHEN v_rent_range_max IS NOT NULL AND v_rent_range_max ~ '^\d+(\.\d+)?$'
           THEN v_rent_range_max::numeric ELSE NULL END,
      v_move_in_window,
      v_credit_score_range,
      v_employment_status,
      -- Map yearly income range strings to numeric midpoints
      CASE
        WHEN v_monthly_income = 'under-15000' THEN 12000
        WHEN v_monthly_income = '15000-25000' THEN 20000
        WHEN v_monthly_income = '25000-35000' THEN 30000
        WHEN v_monthly_income = '35000-50000' THEN 42500
        WHEN v_monthly_income = '50000-75000' THEN 62500
        WHEN v_monthly_income = '75000-plus' THEN 90000
        -- Legacy monthly income values (backward compatibility)
        WHEN v_monthly_income = 'under-1000' THEN 500
        WHEN v_monthly_income = '1000-2000' THEN 1500
        WHEN v_monthly_income = '2000-3000' THEN 2500
        WHEN v_monthly_income = '3000-4000' THEN 3500
        WHEN v_monthly_income = '4000-plus' THEN 5000
        WHEN v_monthly_income IS NOT NULL AND v_monthly_income ~ '^\d+(\.\d+)?$'
             THEN v_monthly_income::numeric
        ELSE NULL
      END,
      v_has_eviction,
      v_eviction_details,
      v_has_pets,
      v_pet_type,
      v_has_felonies,
      v_felony_details,
      v_has_accessibility_needs,
      v_accessibility_details,
      v_signup_notes,
      CASE WHEN v_current_rent_portion IS NOT NULL AND v_current_rent_portion ~ '^\d+(\.\d+)?$'
           THEN v_current_rent_portion::numeric ELSE NULL END,
      v_tenant_intent,
      v_seo_source,
      v_seo_template_type,
      v_seo_city,
      v_seo_state,
      v_seo_page_url,
      v_sms_consent,
      v_desired_city,
      v_desired_state,
      v_desired_zip_code
    )
    ON CONFLICT (user_id) DO UPDATE SET
      phone_type = COALESCE(EXCLUDED.phone_type, tenant_profiles.phone_type),
      country_code = COALESCE(EXCLUDED.country_code, tenant_profiles.country_code),
      state = COALESCE(EXCLUDED.state, tenant_profiles.state),
      city = COALESCE(EXCLUDED.city, tenant_profiles.city),
      zip_code = COALESCE(EXCLUDED.zip_code, tenant_profiles.zip_code),
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
      eviction_details = COALESCE(EXCLUDED.eviction_details, tenant_profiles.eviction_details),
      has_pets = COALESCE(EXCLUDED.has_pets, tenant_profiles.has_pets),
      pet_type = COALESCE(EXCLUDED.pet_type, tenant_profiles.pet_type),
      has_felonies = COALESCE(EXCLUDED.has_felonies, tenant_profiles.has_felonies),
      felony_details = COALESCE(EXCLUDED.felony_details, tenant_profiles.felony_details),
      has_accessibility_needs = COALESCE(EXCLUDED.has_accessibility_needs, tenant_profiles.has_accessibility_needs),
      accessibility_details = COALESCE(EXCLUDED.accessibility_details, tenant_profiles.accessibility_details),
      signup_notes = COALESCE(EXCLUDED.signup_notes, tenant_profiles.signup_notes),
      current_rent_portion = COALESCE(EXCLUDED.current_rent_portion, tenant_profiles.current_rent_portion),
      tenant_intent = COALESCE(EXCLUDED.tenant_intent, tenant_profiles.tenant_intent),
      seo_source = COALESCE(EXCLUDED.seo_source, tenant_profiles.seo_source),
      seo_template_type = COALESCE(EXCLUDED.seo_template_type, tenant_profiles.seo_template_type),
      seo_city = COALESCE(EXCLUDED.seo_city, tenant_profiles.seo_city),
      seo_state = COALESCE(EXCLUDED.seo_state, tenant_profiles.seo_state),
      seo_page_url = COALESCE(EXCLUDED.seo_page_url, tenant_profiles.seo_page_url),
      sms_consent = COALESCE(EXCLUDED.sms_consent, tenant_profiles.sms_consent),
      desired_city = COALESCE(EXCLUDED.desired_city, tenant_profiles.desired_city),
      desired_state = COALESCE(EXCLUDED.desired_state, tenant_profiles.desired_state),
      desired_zip_code = COALESCE(EXCLUDED.desired_zip_code, tenant_profiles.desired_zip_code),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;
