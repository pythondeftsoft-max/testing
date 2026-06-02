
-- Backfill: sync agency_id from housing_authority_id where missing
UPDATE public.tenant_profiles
SET agency_id = housing_authority_id
WHERE housing_authority_id IS NOT NULL AND agency_id IS NULL;

-- Backfill: sync housing_authority_id from agency_id where missing
UPDATE public.tenant_profiles
SET housing_authority_id = agency_id
WHERE agency_id IS NOT NULL AND housing_authority_id IS NULL;

-- Updated trigger function that sets BOTH columns
CREATE OR REPLACE FUNCTION public.sync_tenant_to_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_agency_id uuid;
BEGIN
  -- If housing_authority_id was just set directly (e.g. from dropdown), sync to agency_id
  IF NEW.housing_authority_id IS NOT NULL AND NEW.agency_id IS NULL THEN
    NEW.agency_id := NEW.housing_authority_id;
  END IF;

  -- If agency_id was just set directly, sync to housing_authority_id
  IF NEW.agency_id IS NOT NULL AND NEW.housing_authority_id IS NULL THEN
    NEW.housing_authority_id := NEW.agency_id;
  END IF;

  -- If both are already set, nothing more to do
  IF NEW.agency_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Try matching by housing_authority text (case-insensitive partial match on name)
  IF NEW.housing_authority IS NOT NULL AND NEW.housing_authority <> '' THEN
    SELECT id INTO matched_agency_id
    FROM public.housing_authorities
    WHERE is_active = true
      AND (
        lower(name) = lower(trim(NEW.housing_authority))
        OR lower(name) LIKE '%' || lower(trim(NEW.housing_authority)) || '%'
        OR lower(trim(NEW.housing_authority)) LIKE '%' || lower(name) || '%'
      )
    ORDER BY
      CASE WHEN lower(name) = lower(trim(NEW.housing_authority)) THEN 0 ELSE 1 END,
      length(name)
    LIMIT 1;
  END IF;

  -- Fallback: match by city + state from profile
  IF matched_agency_id IS NULL AND NEW.city IS NOT NULL AND NEW.state IS NOT NULL THEN
    SELECT id INTO matched_agency_id
    FROM public.housing_authorities
    WHERE is_active = true
      AND lower(city) = lower(trim(NEW.city))
      AND lower(state) = lower(trim(NEW.state))
    LIMIT 1;
  END IF;

  IF matched_agency_id IS NOT NULL THEN
    NEW.agency_id := matched_agency_id;
    NEW.housing_authority_id := matched_agency_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach trigger to also fire on housing_authority_id changes
DROP TRIGGER IF EXISTS trg_sync_tenant_to_agency ON public.tenant_profiles;
CREATE TRIGGER trg_sync_tenant_to_agency
  BEFORE INSERT OR UPDATE OF housing_authority, housing_authority_id, agency_id, city, state
  ON public.tenant_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_tenant_to_agency();
