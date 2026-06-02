-- Force trigger to fire on every existing row (no-op data change, real wallet recompute)
UPDATE public.pha_enrichment SET leased_units = leased_units;