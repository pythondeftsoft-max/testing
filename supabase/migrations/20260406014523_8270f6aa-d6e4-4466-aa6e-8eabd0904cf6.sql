
-- Add new columns to housing_authorities for HUD data
ALTER TABLE public.housing_authorities
  ADD COLUMN IF NOT EXISTS zipcode text,
  ADD COLUMN IF NOT EXISTS pha_code text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Unique constraint on pha_code for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_housing_authorities_pha_code
  ON public.housing_authorities (pha_code) WHERE pha_code IS NOT NULL;

-- Index for tenant matching by city+state
CREATE INDEX IF NOT EXISTS idx_housing_authorities_city_state
  ON public.housing_authorities (lower(city), lower(state));

-- Trigger function to auto-link tenant to housing authority
CREATE OR REPLACE FUNCTION public.sync_tenant_to_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_agency_id uuid;
BEGIN
  -- Skip if agency_id is already set
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
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_sync_tenant_to_agency ON public.tenant_profiles;
CREATE TRIGGER trg_sync_tenant_to_agency
  BEFORE INSERT OR UPDATE OF housing_authority, city, state
  ON public.tenant_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_tenant_to_agency();
