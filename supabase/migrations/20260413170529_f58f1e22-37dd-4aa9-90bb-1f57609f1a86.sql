
-- 1. Reset all agencies to not onboarded
UPDATE housing_authorities SET is_onboarded = false;

-- 2. Re-derive from real usage: mark onboarded only where active staff exist
UPDATE housing_authorities ha
SET is_onboarded = true
WHERE EXISTS (
  SELECT 1 FROM agency_staff s WHERE s.agency_id = ha.id AND s.is_active = true
);

-- 3. Create trigger to auto-mark agency as onboarded when staff is added
CREATE OR REPLACE FUNCTION public.auto_onboard_agency_on_staff_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE housing_authorities
  SET is_onboarded = true
  WHERE id = NEW.agency_id AND is_onboarded = false;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_onboard_agency
AFTER INSERT ON public.agency_staff
FOR EACH ROW
EXECUTE FUNCTION public.auto_onboard_agency_on_staff_insert();
