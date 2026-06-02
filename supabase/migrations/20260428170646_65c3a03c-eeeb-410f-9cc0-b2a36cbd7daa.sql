CREATE TABLE public.pha_enrichment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  mode text NOT NULL DEFAULT 'missing',
  total_count integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pha_enrichment_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view enrichment jobs"
  ON public.pha_enrichment_jobs FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert enrichment jobs"
  ON public.pha_enrichment_jobs FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update enrichment jobs"
  ON public.pha_enrichment_jobs FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_pha_enrichment_jobs_updated_at
  BEFORE UPDATE ON public.pha_enrichment_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pha_enrichment_jobs_status ON public.pha_enrichment_jobs(status, started_at DESC);