
-- 1. Trigger function: cleanup computed_matches when a unit goes off-market or becomes occupied
CREATE OR REPLACE FUNCTION public.cleanup_computed_matches_on_unit_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.on_market = false OR NEW.status = 'occupied') THEN
    DELETE FROM public.computed_matches WHERE unit_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Trigger on property_units
CREATE TRIGGER trg_cleanup_computed_matches_on_unit_change
AFTER UPDATE OF on_market, status ON public.property_units
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_computed_matches_on_unit_change();

-- 3. Trigger function: cleanup computed_matches when a property goes off-market
CREATE OR REPLACE FUNCTION public.cleanup_computed_matches_on_property_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.on_market = false) THEN
    DELETE FROM public.computed_matches
    WHERE unit_id IN (SELECT id FROM public.property_units WHERE property_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Trigger on properties
CREATE TRIGGER trg_cleanup_computed_matches_on_property_change
AFTER UPDATE OF on_market ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_computed_matches_on_property_change();
