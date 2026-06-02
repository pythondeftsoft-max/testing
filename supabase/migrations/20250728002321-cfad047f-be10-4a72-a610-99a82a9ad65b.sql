-- Fix the schema path issue in handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    user_type,
    company_name,
    phone
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    COALESCE(
      (new.raw_user_meta_data ->> 'user_type')::public.user_type,
      'individual_owner'::public.user_type
    ),
    new.raw_user_meta_data ->> 'company_name',
    new.raw_user_meta_data ->> 'phone'
  );
  
  -- Initialize user points
  PERFORM public.initialize_user_points(new.id);
  
  RETURN new;
END;
$$;