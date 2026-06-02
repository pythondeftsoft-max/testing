CREATE TABLE IF NOT EXISTS public.pha_enrichment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pha_code text NOT NULL UNIQUE,

  -- HUD operations
  admin_fee_col_a numeric,
  admin_fee_col_b numeric,
  leased_units integer,
  authorized_units integer,
  utilization_pct numeric,

  -- Performance
  semap_score integer,
  semap_tier text,
  semap_fy integer,
  is_mtw boolean DEFAULT false,
  mtw_cohort text,

  -- Subsidy stats
  avg_hap_per_unit numeric,
  avg_tenant_rent numeric,
  avg_hh_income numeric,

  -- Public contact
  ed_name text,
  ed_email text,
  ed_phone text,

  -- Tech intel (from website scraping)
  detected_software text[] DEFAULT '{}',
  detected_payment_method text,
  has_online_portal boolean,
  portal_vendor text,
  latest_rfp_url text,
  latest_rfp_date date,

  -- Context
  federal_funding_5yr numeric,
  population integer,
  median_income numeric,
  rent_burden_pct numeric,

  -- Meta
  enriched_at timestamptz DEFAULT now(),
  website_enriched_at timestamptz,
  enrichment_source jsonb DEFAULT '{}'::jsonb,

  -- Generated columns for pricing
  estimated_admin_budget_annual numeric GENERATED ALWAYS AS (
    COALESCE(admin_fee_col_a, 0) * COALESCE(leased_units, 0) * 12 + COALESCE(admin_fee_col_b, 0)
  ) STORED,
  saas_wallet_low numeric GENERATED ALWAYS AS (
    (COALESCE(admin_fee_col_a, 0) * COALESCE(leased_units, 0) * 12 + COALESCE(admin_fee_col_b, 0))
    * CASE WHEN is_mtw THEN 0.04 ELSE 0.02 END
  ) STORED,
  saas_wallet_high numeric GENERATED ALWAYS AS (
    (COALESCE(admin_fee_col_a, 0) * COALESCE(leased_units, 0) * 12 + COALESCE(admin_fee_col_b, 0))
    * CASE WHEN is_mtw THEN 0.10 ELSE 0.06 END
  ) STORED,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pha_enrichment_pha_code ON public.pha_enrichment(pha_code);
CREATE INDEX IF NOT EXISTS idx_pha_enrichment_semap_tier ON public.pha_enrichment(semap_tier);
CREATE INDEX IF NOT EXISTS idx_pha_enrichment_is_mtw ON public.pha_enrichment(is_mtw) WHERE is_mtw = true;
CREATE INDEX IF NOT EXISTS idx_pha_enrichment_saas_wallet_high ON public.pha_enrichment(saas_wallet_high DESC);

ALTER TABLE public.pha_enrichment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pha_enrichment"
  ON public.pha_enrichment FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert pha_enrichment"
  ON public.pha_enrichment FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update pha_enrichment"
  ON public.pha_enrichment FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role full access pha_enrichment"
  ON public.pha_enrichment FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_pha_enrichment_updated_at
  BEFORE UPDATE ON public.pha_enrichment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();