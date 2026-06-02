ALTER TABLE public.pha_enrichment
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS last_rfp_seen_at timestamptz;

CREATE INDEX IF NOT EXISTS pha_enrichment_last_rfp_seen_at_idx
  ON public.pha_enrichment (last_rfp_seen_at)
  WHERE last_rfp_seen_at IS NOT NULL;