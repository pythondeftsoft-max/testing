
CREATE OR REPLACE FUNCTION public.set_listed_date_on_market()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.on_market = true AND NEW.listed_date IS NULL THEN
    NEW.listed_date := NOW();
  END IF;
  IF NEW.on_market = false THEN
    NEW.listed_date := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_listed_date
  BEFORE INSERT OR UPDATE ON property_units
  FOR EACH ROW
  EXECUTE FUNCTION public.set_listed_date_on_market();

UPDATE property_units SET listed_date = created_at WHERE on_market = true AND listed_date IS NULL;
