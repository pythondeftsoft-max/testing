
-- Additive columns on existing deal tables
ALTER TABLE public.agency_leads
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS lost_competitor text,
  ADD COLUMN IF NOT EXISTS revisit_at timestamptz;

ALTER TABLE public.pha_prospect_status
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS lost_competitor text,
  ADD COLUMN IF NOT EXISTS revisit_at timestamptz;

-- Stage entry history (append-only)
CREATE TABLE IF NOT EXISTS public.agency_deal_stage_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  deal_source text NOT NULL CHECK (deal_source IN ('lead','prospect')),
  stage text NOT NULL,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  entered_by uuid,
  entered_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deal_stage_data_deal ON public.agency_deal_stage_data (deal_source, deal_id, entered_at DESC);

ALTER TABLE public.agency_deal_stage_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deal_stage_data_admin_select" ON public.agency_deal_stage_data;
CREATE POLICY "deal_stage_data_admin_select" ON public.agency_deal_stage_data
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "deal_stage_data_admin_insert" ON public.agency_deal_stage_data;
CREATE POLICY "deal_stage_data_admin_insert" ON public.agency_deal_stage_data
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- Per-deal settings (1 row per deal)
CREATE TABLE IF NOT EXISTS public.agency_deal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  deal_source text NOT NULL CHECK (deal_source IN ('lead','prospect')),
  fast_path_preset text,
  default_trial_length_days integer,
  custom_field_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_source, deal_id)
);

ALTER TABLE public.agency_deal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deal_settings_admin_select" ON public.agency_deal_settings;
CREATE POLICY "deal_settings_admin_select" ON public.agency_deal_settings
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "deal_settings_admin_write" ON public.agency_deal_settings;
CREATE POLICY "deal_settings_admin_write" ON public.agency_deal_settings
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
