ALTER TABLE public.pha_enrichment
  ADD COLUMN IF NOT EXISTS pages_scanned text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS pages_scanned_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_scanned_at timestamptz,
  ADD COLUMN IF NOT EXISTS scan_depth text DEFAULT 'homepage';