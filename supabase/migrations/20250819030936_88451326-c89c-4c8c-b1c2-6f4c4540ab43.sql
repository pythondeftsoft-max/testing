
-- Phase 1: Data model and scaffolding

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketplace_access_reason') THEN
    CREATE TYPE public.marketplace_access_reason AS ENUM ('none','looking_for_housing','landlord_shopping','other');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_context') THEN
    CREATE TYPE public.role_context AS ENUM ('tenant','landlord','investor','none');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_mode') THEN
    CREATE TYPE public.tenant_mode AS ENUM ('residential','commercial','mixed');
  END IF;
END
$$;

-- 2) Extend tenant_profiles with marketplace-related fields
-- Assumes public.tenant_profiles exists (used by current code)
ALTER TABLE public.tenant_profiles
  ADD COLUMN IF NOT EXISTS housing_interest boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketplace_access_reason public.marketplace_access_reason NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS marketplace_prompt_dismissed_at timestamp with time zone NULL;

-- 3) Create per-user preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_role_context public.role_context NOT NULL DEFAULT 'none',
  active_tenant_mode public.tenant_mode NOT NULL DEFAULT 'mixed',
  show_marketplace boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences (user_id);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for user-scoped access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_preferences' AND policyname='Users can view their own preferences'
  ) THEN
    CREATE POLICY "Users can view their own preferences"
      ON public.user_preferences
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_preferences' AND policyname='Users can insert their own preferences'
  ) THEN
    CREATE POLICY "Users can insert their own preferences"
      ON public.user_preferences
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_preferences' AND policyname='Users can update their own preferences'
  ) THEN
    CREATE POLICY "Users can update their own preferences"
      ON public.user_preferences
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_preferences' AND policyname='Users can delete their own preferences'
  ) THEN
    CREATE POLICY "Users can delete their own preferences"
      ON public.user_preferences
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- 4) Generic updated_at trigger function (safe, reusable)
CREATE OR REPLACE FUNCTION public.update_updated_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Attach trigger to user_preferences
DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_timestamp();
