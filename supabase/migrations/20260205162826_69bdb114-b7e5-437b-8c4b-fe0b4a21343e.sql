-- Part 1: Add trigger on properties table to queue child units when property goes on_market
CREATE OR REPLACE FUNCTION trigger_property_market_queue()
RETURNS TRIGGER AS $$
BEGIN
  -- When property goes on_market, queue all its units for match computation
  IF NEW.on_market = true AND (OLD.on_market IS NULL OR OLD.on_market = false) THEN
    INSERT INTO public.match_compute_queue (entity_type, entity_id, requested_at)
    SELECT 'property', id, now()
    FROM property_units
    WHERE property_id = NEW.id
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on properties table
DROP TRIGGER IF EXISTS property_market_queue_trigger ON properties;
CREATE TRIGGER property_market_queue_trigger
AFTER UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION trigger_property_market_queue();

-- Part 2: Backfill - queue all on-market units that don't have computed matches yet
INSERT INTO match_compute_queue (entity_type, entity_id, requested_at)
SELECT DISTINCT 'property', pu.id, now()
FROM property_units pu
JOIN properties p ON pu.property_id = p.id
LEFT JOIN computed_matches cm ON cm.unit_id = pu.id
WHERE (pu.on_market = true OR p.on_market = true)
  AND p.deleted_at IS NULL
  AND cm.unit_id IS NULL
ON CONFLICT (entity_type, entity_id) DO NOTHING;