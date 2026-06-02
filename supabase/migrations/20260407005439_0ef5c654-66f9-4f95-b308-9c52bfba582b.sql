
-- Add housing_authority_id FK column to tenant_profiles
ALTER TABLE public.tenant_profiles 
ADD COLUMN IF NOT EXISTS housing_authority_id UUID REFERENCES public.housing_authorities(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_housing_authority_id 
ON public.tenant_profiles(housing_authority_id);

-- Create trigger function to maintain tenant_count on housing_authorities
CREATE OR REPLACE FUNCTION public.update_housing_authority_tenant_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Decrement old authority count
  IF OLD.housing_authority_id IS NOT NULL AND (TG_OP = 'DELETE' OR OLD.housing_authority_id IS DISTINCT FROM NEW.housing_authority_id) THEN
    UPDATE public.housing_authorities
    SET tenant_count = GREATEST(0, COALESCE(tenant_count, 0) - 1)
    WHERE id = OLD.housing_authority_id;
  END IF;

  -- Increment new authority count
  IF TG_OP != 'DELETE' AND NEW.housing_authority_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.housing_authority_id IS DISTINCT FROM NEW.housing_authority_id) THEN
    UPDATE public.housing_authorities
    SET tenant_count = COALESCE(tenant_count, 0) + 1
    WHERE id = NEW.housing_authority_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach the trigger
DROP TRIGGER IF EXISTS trg_update_ha_tenant_count ON public.tenant_profiles;
CREATE TRIGGER trg_update_ha_tenant_count
AFTER INSERT OR UPDATE OF housing_authority_id OR DELETE
ON public.tenant_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_housing_authority_tenant_count();

-- Update handle_new_user to save housing_authority_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  raw_meta jsonb;
  v_role text;
  v_full_name text;
  v_avatar_url text;
  v_intent text;
  v_ha_id uuid;
BEGIN
  raw_meta := NEW.raw_user_meta_data;
  v_role := COALESCE(raw_meta->>'role', 'tenant');
  v_full_name := COALESCE(raw_meta->>'full_name', raw_meta->>'name', '');
  v_avatar_url := COALESCE(raw_meta->>'avatar_url', '');
  v_intent := COALESCE(raw_meta->>'tenant_intent', 'housing_seeker');

  -- Resolve housing authority ID from metadata (may be null)
  v_ha_id := NULL;
  IF raw_meta->>'tenant_housing_authority_id' IS NOT NULL AND raw_meta->>'tenant_housing_authority_id' != '' THEN
    v_ha_id := (raw_meta->>'tenant_housing_authority_id')::uuid;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (NEW.id, v_full_name, v_avatar_url, v_role)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    role = EXCLUDED.role;

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
$$;
