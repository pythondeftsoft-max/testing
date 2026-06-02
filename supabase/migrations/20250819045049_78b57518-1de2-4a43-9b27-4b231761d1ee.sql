
-- 1) Ensure enum exists and includes 'tenant'
DO $$
BEGIN
  -- Create the enum if it somehow doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'user_type'
  ) THEN
    CREATE TYPE public.user_type AS ENUM ('admin','landlord','property_manager','individual_owner');
  END IF;

  -- Add 'tenant' if it isn't already there
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_type' AND e.enumlabel = 'tenant'
  ) THEN
    ALTER TYPE public.user_type ADD VALUE 'tenant';
  END IF;
END
$$;

-- 2) Fix the signup trigger to schema-qualify the enum and use safe defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_type public.user_type;
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

  -- If the user is a tenant and tenant_profiles table exists, create a minimal record (idempotent)
  IF v_user_type = 'tenant'::public.user_type
     AND to_regclass('public.tenant_profiles') IS NOT NULL THEN
    INSERT INTO public.tenant_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Also qualify enum casts in is_admin_safe to avoid future search_path issues
CREATE OR REPLACE FUNCTION public.is_admin_safe(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
      AND user_type = 'admin'::public.user_type
  );
$$;
