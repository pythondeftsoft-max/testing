-- ============================================================
-- Trigger to cleanup computed_matches when PARENT PROPERTY goes off-market
-- This complements the existing trigger on property_units
-- ============================================================

-- Create function to cleanup matches when property on_market becomes false
CREATE OR REPLACE FUNCTION public.cleanup_computed_matches_on_property_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If property goes from on_market=true to on_market=false
  IF NEW.on_market = false AND OLD.on_market = true THEN
    DELETE FROM public.computed_matches 
    WHERE unit_id IN (
      SELECT id FROM public.property_units WHERE property_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger on properties table
DROP TRIGGER IF EXISTS cleanup_matches_on_property_off_market ON public.properties;
CREATE TRIGGER cleanup_matches_on_property_off_market
  AFTER UPDATE OF on_market ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_computed_matches_on_property_status_change();

-- ============================================================
-- One-time data cleanup: Remove cached matches for units whose
-- parent property is off-market
-- ============================================================
DELETE FROM public.computed_matches
WHERE unit_id IN (
  SELECT pu.id FROM public.property_units pu
  JOIN public.properties p ON pu.property_id = p.id
  WHERE p.on_market = false
);