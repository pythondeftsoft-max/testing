
-- Phase 1: AI Insights data model + security hardening

-- 1) Bring ai_insights_cache in line with edge function expectations
ALTER TABLE public.ai_insights_cache
  ADD COLUMN IF NOT EXISTS landlord_id uuid,
  ADD COLUMN IF NOT EXISTS portfolio_id uuid,
  ADD COLUMN IF NOT EXISTS analysis_type text,
  ADD COLUMN IF NOT EXISTS insights_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  ADD COLUMN IF NOT EXISTS generated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS hit_count integer DEFAULT 0;

-- Backfill insights_data from legacy "insights" column if present and target is empty/null
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_insights_cache'
      AND column_name = 'insights'
  ) THEN
    UPDATE public.ai_insights_cache
    SET insights_data = COALESCE(NULLIF(insights_data, '{}'::jsonb), insights)::jsonb
    WHERE insights IS NOT NULL
      AND (insights_data IS NULL OR insights_data = '{}'::jsonb);
  END IF;
END
$$;

-- 2) Indexes for performance and TTL workflows
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_insights_cache_cache_key ON public.ai_insights_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_expires_at ON public.ai_insights_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_owner_portfolio ON public.ai_insights_cache(landlord_id, portfolio_id);

-- 3) Updated_at trigger (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_ai_insights_cache_updated_at'
  ) THEN
    CREATE TRIGGER set_ai_insights_cache_updated_at
    BEFORE UPDATE ON public.ai_insights_cache
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
  END IF;
END
$$;

-- 4) Replace overly-permissive RLS policies on ai_insights_cache
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='ai_insights_cache'
      AND policyname='System can manage cache'
  ) THEN
    DROP POLICY "System can manage cache" ON public.ai_insights_cache;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='ai_insights_cache'
      AND policyname='Users can view their cached insights'
  ) THEN
    DROP POLICY "Users can view their cached insights" ON public.ai_insights_cache;
  END IF;
END
$$;

-- 5) Secure, least-privilege RLS for ai_insights_cache
-- Allow row access if user is the landlord or has portfolio role
CREATE POLICY ai_insights_cache_select
  ON public.ai_insights_cache
  FOR SELECT
  USING (
    (landlord_id = auth.uid())
    OR (
      portfolio_id IS NOT NULL
      AND has_portfolio_role(
        portfolio_id,
        auth.uid(),
        ARRAY['admin_partner'::portfolio_role_type,'editor'::portfolio_role_type,'viewer'::portfolio_role_type]
      )
    )
  );

-- Landlords can insert cache rows for themselves
CREATE POLICY ai_insights_cache_insert
  ON public.ai_insights_cache
  FOR INSERT
  WITH CHECK (landlord_id = auth.uid());

-- Landlords can update their own cached rows
CREATE POLICY ai_insights_cache_update
  ON public.ai_insights_cache
  FOR UPDATE
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Service role (for background jobs / maintenance) can do everything
CREATE POLICY ai_insights_cache_service
  ON public.ai_insights_cache
  FOR ALL
  USING (current_setting('role') = 'service_role');
