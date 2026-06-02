-- Add registry status labeling and archive flag (additive, non-breaking)
ALTER TABLE public.housing_authorities
  ADD COLUMN IF NOT EXISTS registry_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_housing_authorities_registry_status
  ON public.housing_authorities (registry_status);

CREATE INDEX IF NOT EXISTS idx_housing_authorities_is_archived
  ON public.housing_authorities (is_archived);

COMMENT ON COLUMN public.housing_authorities.registry_status IS
  'Reconciliation label vs HUD ArcGIS roster: active_hud | stale_hud | manual | unknown';
COMMENT ON COLUMN public.housing_authorities.is_archived IS
  'Soft-archive flag. Archived rows are hidden from prospects, coverage, and enrichment.';