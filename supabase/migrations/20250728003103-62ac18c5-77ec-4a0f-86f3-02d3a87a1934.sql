-- Update handle_new_user function to create tenant_profiles for tenant users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Insert into public.profiles
  INSERT INTO public.profiles (id, first_name, last_name, user_type)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name', 
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE((NEW.raw_user_meta_data ->> 'user_type')::user_type, 'tenant'::user_type)
  );
  
  -- If user_type is tenant, also create tenant_profiles record
  IF COALESCE((NEW.raw_user_meta_data ->> 'user_type')::user_type, 'tenant'::user_type) = 'tenant'::user_type THEN
    INSERT INTO public.tenant_profiles (
      id,
      move_in_window,
      voucher_status,
      employment_status,
      monthly_income
    ) VALUES (
      NEW.id,
      'asap'::move_in_window_type,
      'no'::voucher_status_type,
      'unemployed',
      0
    );
  END IF;
  
  RETURN NEW;
END;
$$;