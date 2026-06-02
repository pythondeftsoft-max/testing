-- Enhance handle_new_user to copy location data from tenant applications
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_type public.user_type;
  v_application_state text;
  v_application_country_code text;
BEGIN
  -- Safely coerce metadata to our enum; default to 'tenant'
  BEGIN
    v_user_type := COALESCE(
      (NEW.raw_user_meta_data ->> 'user_type')::public.user_type,
      'tenant'::public.user_type
    );
  EXCEPTION WHEN others THEN
    v_user_type := 'tenant'::public.user_type;
  END;

  -- Create profile (ignore if it already exists)
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

  -- If the user is a tenant and tenant_profiles table exists, create record with location data
  IF v_user_type = 'tenant'::public.user_type
     AND to_regclass('public.tenant_profiles') IS NOT NULL THEN
    
    -- Look up their application data by email
    SELECT state, country_code 
    INTO v_application_state, v_application_country_code
    FROM public.tenant_applications
    WHERE email = NEW.email
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Create tenant_profiles with location data from application
    INSERT INTO public.tenant_profiles (user_id, state, country_code)
    VALUES (NEW.id, v_application_state, v_application_country_code)
    ON CONFLICT (user_id) DO UPDATE
    SET state = EXCLUDED.state,
        country_code = EXCLUDED.country_code;
    
    -- The assign_tenant_territory() trigger will fire automatically after this insert/update
  END IF;

  RETURN NEW;
END;
$$;