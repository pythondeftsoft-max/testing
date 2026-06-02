
-- Add tenant_intent column to tenant_profiles
ALTER TABLE public.tenant_profiles 
  ADD COLUMN IF NOT EXISTS tenant_intent text DEFAULT 'housing_seeker';

-- Update handle_new_user function to save tenant_intent from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_type public.user_type;
  v_income_value NUMERIC;
  v_bedrooms_arr TEXT[];
BEGIN
  -- Get user type from metadata
  BEGIN
    v_user_type := COALESCE(
      (NEW.raw_user_meta_data ->> 'user_type')::public.user_type,
      'tenant'::public.user_type
    );
  EXCEPTION WHEN others THEN
    v_user_type := 'tenant'::public.user_type;
  END;

  -- Map income string to numeric value (matches Auth.tsx incomeMap)
  v_income_value := CASE (NEW.raw_user_meta_data ->> 'tenant_monthly_income')
    WHEN 'under-1000' THEN 500
    WHEN '1000-2000' THEN 1500
    WHEN '2000-3000' THEN 2500
    WHEN '3000-4000' THEN 3500
    WHEN '4000-plus' THEN 5000
    ELSE NULL
  END;

  -- Parse bedrooms_approved array from JSONB
  BEGIN
    IF NEW.raw_user_meta_data -> 'tenant_bedrooms_approved' IS NOT NULL 
       AND jsonb_typeof(NEW.raw_user_meta_data -> 'tenant_bedrooms_approved') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data -> 'tenant_bedrooms_approved'))
      INTO v_bedrooms_arr;
    ELSE
      v_bedrooms_arr := NULL;
    END IF;
  EXCEPTION WHEN others THEN
    v_bedrooms_arr := NULL;
  END;

  -- Create profile
  INSERT INTO public.profiles (id, first_name, last_name, user_type, company_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    v_user_type,
    NEW.raw_user_meta_data ->> 'company_name',
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  -- If tenant, create tenant_profiles with ALL fields from metadata
  IF v_user_type = 'tenant'::public.user_type
     AND to_regclass('public.tenant_profiles') IS NOT NULL THEN
    
    INSERT INTO public.tenant_profiles (
      user_id,
      tenant_intent,
      phone_type,
      country_code,
      state,
      city,
      zip_code,
      voucher_status,
      voucher_holder,
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
      signup_notes
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'tenant_intent', 'housing_seeker'),
      NEW.raw_user_meta_data ->> 'tenant_phone_type',
      COALESCE(NEW.raw_user_meta_data ->> 'tenant_country_code', 'US'),
      NEW.raw_user_meta_data ->> 'tenant_state',
      NEW.raw_user_meta_data ->> 'tenant_city',
      NEW.raw_user_meta_data ->> 'tenant_zip_code',
      NEW.raw_user_meta_data ->> 'tenant_voucher_status',
      (NEW.raw_user_meta_data ->> 'tenant_voucher_status') = 'yes',
      NEW.raw_user_meta_data ->> 'tenant_housing_authority',
      v_bedrooms_arr,
      NULLIF(NEW.raw_user_meta_data ->> 'tenant_rent_range_min', '')::NUMERIC,
      NULLIF(NEW.raw_user_meta_data ->> 'tenant_rent_range_max', '')::NUMERIC,
      NEW.raw_user_meta_data ->> 'tenant_move_in_window',
      NEW.raw_user_meta_data ->> 'tenant_credit_score_range',
      NEW.raw_user_meta_data ->> 'tenant_employment_status',
      v_income_value,
      COALESCE((NEW.raw_user_meta_data ->> 'tenant_has_eviction')::BOOLEAN, false),
      NEW.raw_user_meta_data ->> 'tenant_eviction_details',
      COALESCE((NEW.raw_user_meta_data ->> 'tenant_has_pets')::BOOLEAN, false),
      NEW.raw_user_meta_data ->> 'tenant_pet_type',
      COALESCE((NEW.raw_user_meta_data ->> 'tenant_has_felonies')::BOOLEAN, false),
      NEW.raw_user_meta_data ->> 'tenant_felony_details',
      COALESCE((NEW.raw_user_meta_data ->> 'tenant_has_accessibility_needs')::BOOLEAN, false),
      NEW.raw_user_meta_data ->> 'tenant_accessibility_details',
      NEW.raw_user_meta_data ->> 'tenant_signup_notes'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      tenant_intent = COALESCE(EXCLUDED.tenant_intent, public.tenant_profiles.tenant_intent),
      phone_type = COALESCE(EXCLUDED.phone_type, public.tenant_profiles.phone_type),
      country_code = COALESCE(EXCLUDED.country_code, public.tenant_profiles.country_code),
      state = COALESCE(EXCLUDED.state, public.tenant_profiles.state),
      city = COALESCE(EXCLUDED.city, public.tenant_profiles.city),
      zip_code = COALESCE(EXCLUDED.zip_code, public.tenant_profiles.zip_code),
      voucher_status = COALESCE(EXCLUDED.voucher_status, public.tenant_profiles.voucher_status),
      voucher_holder = COALESCE(EXCLUDED.voucher_holder, public.tenant_profiles.voucher_holder),
      housing_authority = COALESCE(EXCLUDED.housing_authority, public.tenant_profiles.housing_authority),
      bedrooms_approved = COALESCE(EXCLUDED.bedrooms_approved, public.tenant_profiles.bedrooms_approved),
      rent_range_min = COALESCE(EXCLUDED.rent_range_min, public.tenant_profiles.rent_range_min),
      rent_range_max = COALESCE(EXCLUDED.rent_range_max, public.tenant_profiles.rent_range_max),
      move_in_window = COALESCE(EXCLUDED.move_in_window, public.tenant_profiles.move_in_window),
      credit_score_range = COALESCE(EXCLUDED.credit_score_range, public.tenant_profiles.credit_score_range),
      employment_status = COALESCE(EXCLUDED.employment_status, public.tenant_profiles.employment_status),
      monthly_income = COALESCE(EXCLUDED.monthly_income, public.tenant_profiles.monthly_income),
      has_eviction = COALESCE(EXCLUDED.has_eviction, public.tenant_profiles.has_eviction),
      eviction_details = COALESCE(EXCLUDED.eviction_details, public.tenant_profiles.eviction_details),
      has_pets = COALESCE(EXCLUDED.has_pets, public.tenant_profiles.has_pets),
      pet_type = COALESCE(EXCLUDED.pet_type, public.tenant_profiles.pet_type),
      has_felonies = COALESCE(EXCLUDED.has_felonies, public.tenant_profiles.has_felonies),
      felony_details = COALESCE(EXCLUDED.felony_details, public.tenant_profiles.felony_details),
      has_accessibility_needs = COALESCE(EXCLUDED.has_accessibility_needs, public.tenant_profiles.has_accessibility_needs),
      accessibility_details = COALESCE(EXCLUDED.accessibility_details, public.tenant_profiles.accessibility_details),
      signup_notes = COALESCE(EXCLUDED.signup_notes, public.tenant_profiles.signup_notes);
  END IF;

  -- If landlord, create portfolio with fixed name "Portfolio 1" (not company name)
  IF v_user_type = 'landlord'::public.user_type 
     AND to_regclass('public.portfolios') IS NOT NULL THEN
    INSERT INTO public.portfolios (manager_id, client_name)
    VALUES (
      NEW.id,
      'Portfolio 1'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
