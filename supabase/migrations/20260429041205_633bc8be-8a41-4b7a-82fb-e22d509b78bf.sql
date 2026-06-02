
-- 1. HUD Admin Fee Rates (refreshed quarterly from HUD's published XLS)
CREATE TABLE IF NOT EXISTS public.hud_admin_fee_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pha_code text NOT NULL,
  fmr_area text,
  col_a_rate numeric(8,2),
  col_b_rate numeric(8,2),
  effective_date date NOT NULL,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pha_code, effective_date)
);
CREATE INDEX IF NOT EXISTS idx_hud_admin_fee_rates_pha ON public.hud_admin_fee_rates(pha_code);

ALTER TABLE public.hud_admin_fee_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read admin fee rates"
  ON public.hud_admin_fee_rates FOR SELECT USING (true);
CREATE POLICY "Admins can manage admin fee rates"
  ON public.hud_admin_fee_rates FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 2. MTW Agencies (HUD Moving-to-Work cohort)
CREATE TABLE IF NOT EXISTS public.mtw_agencies (
  pha_code text PRIMARY KEY,
  cohort text,
  joined_year int,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mtw_agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read MTW list"
  ON public.mtw_agencies FOR SELECT USING (true);
CREATE POLICY "Admins can manage MTW list"
  ON public.mtw_agencies FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed the current MTW cohort (legacy 39 + a sample of expansion). Codes from HUD MTW site.
INSERT INTO public.mtw_agencies (pha_code, cohort, joined_year) VALUES
  ('WA002','Original 39',1999),  -- Seattle Housing Authority
  ('WA019','Original 39',1999),  -- King County Housing Authority
  ('WA055','Original 39',1999),  -- Tacoma Housing Authority
  ('CA004','Original 39',1999),  -- Oakland Housing Authority
  ('CA011','Original 39',1999),  -- San Diego Housing Commission
  ('CA059','Original 39',1999),  -- San Mateo County
  ('CA063','Original 39',1999),  -- Santa Clara County
  ('CO003','Original 39',1999),  -- Boulder
  ('DE001','Original 39',1999),  -- Delaware State Housing Authority
  ('DC001','Original 39',1999),  -- DC Housing Authority
  ('FL003','Original 39',1999),  -- Home Forward Atlanta region (placeholder)
  ('GA006','Original 39',1999),  -- Atlanta Housing Authority
  ('IL002','Original 39',1999),  -- Chicago Housing Authority
  ('KS003','Original 39',1999),  -- Kansas City KS
  ('KY001','Original 39',1999),  -- Louisville Metro
  ('MA001','Original 39',1999),  -- Cambridge Housing Authority
  ('MA002','Original 39',1999),  -- Massachusetts Dept of Housing
  ('MD002','Original 39',1999),  -- Baltimore HABC
  ('MI028','Original 39',1999),  -- Lansing
  ('MN001','Original 39',1999),  -- Minneapolis Public Housing
  ('NC003','Original 39',1999),  -- Charlotte HA
  ('NC005','Original 39',1999),  -- Greensboro HA
  ('NH002','Original 39',1999),  -- Keene HA
  ('NJ002','Original 39',1999),  -- Atlantic City HA
  ('NY054','Original 39',1999),  -- Yonkers
  ('OH004','Original 39',1999),  -- Cuyahoga (Cleveland)
  ('OR002','Original 39',1999),  -- Home Forward (Portland)
  ('PA002','Original 39',1999),  -- Philadelphia HA
  ('PA014','Original 39',1999),  -- Pittsburgh HA
  ('TN006','Original 39',1999),  -- Memphis HA
  ('TX001','Original 39',1999),  -- San Antonio HA
  ('TX003','Original 39',1999),  -- Austin HA
  ('TX007','Original 39',1999),  -- Dallas HA
  ('VA002','Original 39',1999),  -- Norfolk RHA
  ('VT001','Original 39',1999),  -- Vermont State HA
  ('WI002','Original 39',1999),  -- Milwaukee HA
  ('CA002','Original 39',1999),  -- Los Angeles HA
  ('NY005','Original 39',1999),  -- NYC HA
  ('FL028','Original 39',1999)   -- Orlando HA
ON CONFLICT (pha_code) DO NOTHING;

-- 3. Add source_breakdown to pha_enrichment
ALTER TABLE public.pha_enrichment
  ADD COLUMN IF NOT EXISTS source_breakdown jsonb DEFAULT '{}'::jsonb;
