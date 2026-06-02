
-- Phase 2: Enterprise toggle for marketplace mode (section8 | mixed)

-- 1) Ensure enterprise_settings table exists with needed columns
CREATE TABLE IF NOT EXISTS public.enterprise_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  is_encrypted boolean NOT NULL DEFAULT false,
  last_modified_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add setting_key column if it was missing previously
ALTER TABLE public.enterprise_settings
  ADD COLUMN IF NOT EXISTS setting_key text;

-- Ensure uniqueness on setting_key (create if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'enterprise_settings_setting_key_key'
  ) THEN
    ALTER TABLE public.enterprise_settings
      ADD CONSTRAINT enterprise_settings_setting_key_key UNIQUE (setting_key);
  END IF;
END $$;

-- 2) RLS: enable and add policies
ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage all settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'enterprise_settings' 
      AND policyname = 'Admins can manage enterprise settings'
  ) THEN
    CREATE POLICY "Admins can manage enterprise settings"
      ON public.enterprise_settings
      FOR ALL
      USING (is_admin(auth.uid()))
      WITH CHECK (is_admin(auth.uid()));
  END IF;
END $$;

-- Allow authenticated users to read only non-encrypted settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'enterprise_settings' 
      AND policyname = 'Authenticated can read non-encrypted enterprise settings'
  ) THEN
    CREATE POLICY "Authenticated can read non-encrypted enterprise settings"
      ON public.enterprise_settings
      FOR SELECT
      USING (auth.uid() IS NOT NULL AND is_encrypted = false);
  END IF;
END $$;

-- 3) Updated-at trigger for enterprise_settings
CREATE OR REPLACE FUNCTION public.update_enterprise_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS update_enterprise_settings_updated_at ON public.enterprise_settings;

CREATE TRIGGER update_enterprise_settings_updated_at
BEFORE UPDATE ON public.enterprise_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_enterprise_settings_updated_at();

-- 4) Seed default business_phase if missing (defaults to "section8")
INSERT INTO public.enterprise_settings (setting_key, setting_value, is_encrypted)
VALUES ('business_phase', '"section8"', false)
ON CONFLICT (setting_key) DO NOTHING;

-- 5) Admin-only RPC to set the business phase
CREATE OR REPLACE FUNCTION public.set_business_phase(p_mode text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_mode text := lower(p_mode);
  v_value jsonb;
BEGIN
  -- Require admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Validate mode
  IF v_mode NOT IN ('section8', 'mixed') THEN
    RAISE EXCEPTION 'Invalid mode: %, allowed: section8|mixed', v_mode;
  END IF;

  v_value := to_jsonb(v_mode);

  INSERT INTO public.enterprise_settings (setting_key, setting_value, is_encrypted, last_modified_by)
  VALUES ('business_phase', v_value, false, auth.uid())
  ON CONFLICT (setting_key)
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    last_modified_by = auth.uid(),
    updated_at = now();

  RETURN v_value;
END;
$$;

-- 6) Optional: helper to read current phase as plain text (no quotes)
CREATE OR REPLACE FUNCTION public.get_business_phase()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COALESCE(
    (SELECT setting_value #>> '{}' FROM public.enterprise_settings WHERE setting_key = 'business_phase' LIMIT 1),
    'section8'
  );
$$;
