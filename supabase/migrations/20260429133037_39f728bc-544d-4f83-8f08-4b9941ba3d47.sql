-- Resumable enrichment job fields (additive, non-breaking)
ALTER TABLE public.pha_enrichment_jobs
  ADD COLUMN IF NOT EXISTS cursor_offset integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_size integer NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_processed_pha_code text,
  ADD COLUMN IF NOT EXISTS parent_job_id uuid REFERENCES public.pha_enrichment_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pha_enrichment_jobs_status_heartbeat
  ON public.pha_enrichment_jobs (status, heartbeat_at DESC);

-- Helper view: jobs whose status is 'running' but no heartbeat for >5 minutes are stalled
CREATE OR REPLACE VIEW public.pha_enrichment_jobs_view AS
SELECT
  j.*,
  CASE
    WHEN j.status = 'running'
      AND COALESCE(j.heartbeat_at, j.updated_at, j.started_at) < (now() - interval '5 minutes')
      THEN true
    ELSE false
  END AS is_stalled
FROM public.pha_enrichment_jobs j;

GRANT SELECT ON public.pha_enrichment_jobs_view TO authenticated;