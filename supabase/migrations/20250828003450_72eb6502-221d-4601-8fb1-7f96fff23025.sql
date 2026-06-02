
-- 1) Fix existing CSV-imported properties that show as draft
UPDATE public.properties
SET
  status = 'vacant',
  occupancy_status = 'vacant',
  on_market = COALESCE(on_market, false),
  updated_at = now()
WHERE import_source = 'csv_import'
  AND (status = 'draft' OR status IS NULL);

-- 2) Fix units created via CSV import that are in draft
-- If your property_units table does not have an updated_at column, remove that line.
UPDATE public.property_units
SET
  status = 'vacant',
  updated_at = now()
WHERE property_id IN (
  SELECT id FROM public.properties WHERE import_source = 'csv_import'
)
AND (status = 'draft' OR status IS NULL);
