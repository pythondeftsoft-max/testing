-- SEMAP score history for trend tracking
CREATE TABLE IF NOT EXISTS public.agency_semap_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  reporting_period text NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  total_score numeric NOT NULL DEFAULT 0,
  total_max numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  passing boolean NOT NULL DEFAULT false,
  indicator_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  triggered_by text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_semap_history_agency_date
  ON public.agency_semap_score_history (agency_id, snapshot_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_semap_history_agency_period_date
  ON public.agency_semap_score_history (agency_id, reporting_period, snapshot_date);

ALTER TABLE public.agency_semap_score_history ENABLE ROW LEVEL SECURITY;

-- Agency staff can view their agency's history
CREATE POLICY "Agency staff can view their SEMAP history"
ON public.agency_semap_score_history
FOR SELECT
TO authenticated
USING (public.is_agency_staff(auth.uid(), agency_id) OR public.is_admin(auth.uid()));

-- Service role only inserts (snapshots are written by edge function)
CREATE POLICY "Service role manages SEMAP history"
ON public.agency_semap_score_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view everything
CREATE POLICY "Admins manage SEMAP history"
ON public.agency_semap_score_history
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));