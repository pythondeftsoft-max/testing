-- Backfill missing listed_date for on-market units
UPDATE property_units
SET listed_date = COALESCE(updated_at, created_at, NOW())
WHERE on_market = true AND listed_date IS NULL;