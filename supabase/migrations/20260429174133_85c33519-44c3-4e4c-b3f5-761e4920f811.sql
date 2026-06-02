CREATE TABLE IF NOT EXISTS public.pha_coverage_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hud_total integer NOT NULL,
  our_total integer NOT NULL,
  missing jsonb NOT NULL DEFAULT '[]'::jsonb,
  by_state jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pha_coverage_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view coverage snapshots"
  ON public.pha_coverage_snapshots FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_pha_coverage_snapshots_checked_at
  ON public.pha_coverage_snapshots (checked_at DESC);