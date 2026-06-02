
-- 1) Add on_market flag to units
ALTER TABLE public.property_units
ADD COLUMN IF NOT EXISTS on_market boolean NOT NULL DEFAULT false;

-- Helpful index for lookups and sync logic
CREATE INDEX IF NOT EXISTS idx_property_units_property_on_market
  ON public.property_units (property_id, on_market);

-- 2) RPC to toggle a unit's market listing and keep the property in sync
CREATE OR REPLACE FUNCTION public.toggle_unit_market_listing(
  p_unit_id uuid,
  p_on_market boolean,
  p_listing_data jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_unit RECORD;
  v_effective_user uuid;
  v_other_listed_count integer;
BEGIN
  v_effective_user := COALESCE(p_user_id, auth.uid());

  -- Fetch unit and parent property owner
  SELECT u.*, p.owner_id, p.id AS property_id
  INTO v_unit
  FROM public.property_units u
  JOIN public.properties p ON p.id = u.property_id
  WHERE u.id = p_unit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Permission: property owner or admin
  IF NOT (is_admin(v_effective_user) OR v_unit.owner_id = v_effective_user) THEN
    RAISE EXCEPTION 'Only admins or the property owner can update unit market listing';
  END IF;

  -- Update unit listing state
  UPDATE public.property_units
  SET on_market = p_on_market,
      updated_at = now()
  WHERE id = p_unit_id;

  -- Sync property-level on_market
  IF p_on_market THEN
    UPDATE public.properties
    SET on_market = true,
        updated_at = now()
    WHERE id = v_unit.property_id;
  ELSE
    SELECT COUNT(*) INTO v_other_listed_count
    FROM public.property_units
    WHERE property_id = v_unit.property_id
      AND on_market = true
      AND id <> p_unit_id;

    IF v_other_listed_count = 0 THEN
      UPDATE public.properties
      SET on_market = false,
          updated_at = now()
      WHERE id = v_unit.property_id;
    END IF;
  END IF;

  RETURN true;
END;
$function$;
