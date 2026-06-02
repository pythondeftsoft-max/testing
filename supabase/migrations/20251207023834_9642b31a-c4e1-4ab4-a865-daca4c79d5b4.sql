-- Fix toggle_unit_market_listing to use owner_id instead of landlord_id
CREATE OR REPLACE FUNCTION public.toggle_unit_market_listing(
  p_unit_id UUID,
  p_on_market BOOLEAN,
  p_listing_data JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit RECORD;
  v_any_units_on_market BOOLEAN;
  v_result JSONB;
BEGIN
  -- Get unit and property info (use owner_id, not landlord_id!)
  SELECT u.*, p.owner_id, p.id as prop_id
  INTO v_unit
  FROM property_units u
  JOIN properties p ON u.property_id = p.id
  WHERE u.id = p_unit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Check authorization using owner_id (skip for admins when p_user_id is null)
  IF p_user_id IS NOT NULL AND v_unit.owner_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this unit';
  END IF;

  -- Update unit on_market status
  UPDATE property_units
  SET 
    on_market = p_on_market,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- If listing data provided, update unit with listing details
  IF p_listing_data IS NOT NULL THEN
    UPDATE property_units
    SET
      monthly_rent = COALESCE((p_listing_data->>'monthly_rent')::NUMERIC, monthly_rent),
      description = COALESCE(p_listing_data->>'description', description),
      available_date = COALESCE((p_listing_data->>'available_date')::DATE, available_date),
      updated_at = NOW()
    WHERE id = p_unit_id;
  END IF;

  -- Check if ANY units in this property are on market
  SELECT EXISTS(
    SELECT 1 FROM property_units 
    WHERE property_id = v_unit.prop_id AND on_market = TRUE
  ) INTO v_any_units_on_market;

  -- Sync property on_market status based on units
  UPDATE properties
  SET 
    on_market = v_any_units_on_market,
    updated_at = NOW()
  WHERE id = v_unit.prop_id;

  v_result := jsonb_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'on_market', p_on_market,
    'property_on_market', v_any_units_on_market
  );

  RETURN v_result;
END;
$$;