-- Cleanup trigger: automatically delete computed_matches when unit becomes occupied or off-market
CREATE OR REPLACE FUNCTION public.cleanup_computed_matches_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If unit goes off-market or becomes occupied, remove its cached matches
  IF (NEW.on_market = false OR NEW.status = 'occupied') 
     AND (OLD.on_market = true AND OLD.status IS DISTINCT FROM 'occupied')
  THEN
    DELETE FROM public.computed_matches WHERE unit_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger (drop first if exists to avoid duplicates)
DROP TRIGGER IF EXISTS cleanup_computed_matches_trigger ON public.property_units;

CREATE TRIGGER cleanup_computed_matches_trigger
AFTER UPDATE ON public.property_units
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_computed_matches_on_status_change();

-- One-time cleanup: remove stale matches for occupied/off-market units
DELETE FROM public.computed_matches
WHERE unit_id IN (
  SELECT pu.id FROM public.property_units pu
  WHERE pu.on_market = false OR pu.status = 'occupied'
);