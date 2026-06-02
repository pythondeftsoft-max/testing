
ALTER TABLE public.agency_semap_scores
  ADD COLUMN IF NOT EXISTS indicator_11_score numeric,
  ADD COLUMN IF NOT EXISTS indicator_12_score numeric,
  ADD COLUMN IF NOT EXISTS indicator_13_score numeric,
  ADD COLUMN IF NOT EXISTS indicator_14_score numeric,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS auto_calculated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.agency_semap_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  fiscal_year int NOT NULL,
  scores jsonb NOT NULL,
  designation text,
  snapshot_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_semap_history_agency_year
  ON public.agency_semap_history(agency_id, fiscal_year DESC);

ALTER TABLE public.agency_semap_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency staff can read SEMAP history" ON public.agency_semap_history;
CREATE POLICY "Agency staff can read SEMAP history"
  ON public.agency_semap_history FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.agency_staff s
      WHERE s.user_id = auth.uid() AND s.agency_id = agency_semap_history.agency_id
    )
  );

ALTER TABLE public.hap_payment_batches
  ADD COLUMN IF NOT EXISTS landlord_notifications_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS landlord_notifications_count int DEFAULT 0;
