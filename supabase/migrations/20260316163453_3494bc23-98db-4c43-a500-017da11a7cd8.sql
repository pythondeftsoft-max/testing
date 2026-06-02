CREATE OR REPLACE FUNCTION trigger_property_market_queue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.on_market = true AND (OLD.on_market IS NULL OR OLD.on_market = false) THEN
    INSERT INTO public.match_compute_queue (entity_type, entity_id, requested_at)
    SELECT 'property', id, now()
    FROM property_units
    WHERE property_id = NEW.id
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;