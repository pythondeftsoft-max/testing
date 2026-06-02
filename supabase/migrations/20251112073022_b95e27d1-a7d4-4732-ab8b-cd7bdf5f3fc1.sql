-- Function to automatically sync property bed/bath totals with unit sum
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
  WHERE property_id = v_property_id
    AND deleted_at IS NULL;

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

-- Create trigger on property_units table
DROP TRIGGER IF EXISTS trigger_sync_property_totals ON public.property_units;

CREATE TRIGGER trigger_sync_property_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.property_units
  FOR EACH ROW
  EXECUTE FUNCTION sync_property_totals_from_units();

-- Add helpful comment
COMMENT ON FUNCTION sync_property_totals_from_units() IS 'Automatically syncs property bedrooms/bathrooms totals to match the sum of all units';
COMMENT ON TRIGGER trigger_sync_property_totals ON public.property_units IS 'Keeps property bed/bath totals in sync with unit sum';