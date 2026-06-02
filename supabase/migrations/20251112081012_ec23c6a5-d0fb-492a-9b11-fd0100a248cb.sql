-- Fix sync_property_totals_from_units trigger to remove non-existent deleted_at column reference
CREATE OR REPLACE FUNCTION sync_property_totals_from_units()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_property_id uuid;
  v_total_beds integer;
  v_total_baths numeric;
BEGIN
  -- Determine which property to update
  IF (TG_OP = 'DELETE') THEN
    v_property_id := OLD.property_id;
  ELSE
    v_property_id := NEW.property_id;
  END IF;

  -- Calculate totals from all units for this property
  SELECT 
    COALESCE(SUM(bedrooms), 0),
    COALESCE(SUM(bathrooms), 0)
  INTO v_total_beds, v_total_baths
  FROM public.property_units
  WHERE property_id = v_property_id;

  -- Update the property totals
  UPDATE public.properties
  SET 
    bedrooms = v_total_beds,
    bathrooms = v_total_baths,
    updated_at = now()
  WHERE id = v_property_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;