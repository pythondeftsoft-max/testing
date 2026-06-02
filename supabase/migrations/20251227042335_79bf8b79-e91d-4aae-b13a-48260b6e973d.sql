-- Step 1: Backfill existing on-market units with null listed_date
UPDATE property_units
SET listed_date = created_at
WHERE on_market = true AND listed_date IS NULL;

-- Step 2: Update admin_set_unit_market_status to set listed_date
CREATE OR REPLACE FUNCTION public.admin_set_unit_market_status(
  p_unit_id UUID,
  p_on_market BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit RECORD;
  v_new_status TEXT;
  v_result JSON;
BEGIN
  -- Get the unit details
  SELECT * INTO v_unit FROM property_units WHERE id = p_unit_id;
  
  IF v_unit IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unit not found');
  END IF;
  
  -- Determine the new status based on on_market value
  IF p_on_market THEN
    v_new_status := 'available';
  ELSE
    v_new_status := 'unavailable';
  END IF;
  
  -- Update the unit with listed_date logic
  UPDATE property_units
  SET 
    on_market = p_on_market,
    status = v_new_status,
    listed_date = CASE 
      WHEN p_on_market = TRUE AND listed_date IS NULL THEN NOW()
      WHEN p_on_market = FALSE THEN NULL
      ELSE listed_date 
    END,
    updated_at = NOW()
  WHERE id = p_unit_id;
  
  RETURN json_build_object(
    'success', true, 
    'unit_id', p_unit_id,
    'on_market', p_on_market,
    'status', v_new_status
  );
END;
$$;

-- Step 3: Update toggle_unit_market_listing to set listed_date
CREATE OR REPLACE FUNCTION public.toggle_unit_market_listing(
  p_unit_id UUID,
  p_on_market BOOLEAN,
  p_available_date DATE DEFAULT NULL,
  p_rent_amount NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit RECORD;
  v_property RECORD;
  v_landlord_id UUID;
  v_result JSON;
BEGIN
  -- Get the unit with property info
  SELECT u.*, p.landlord_id, p.id as property_id
  INTO v_unit
  FROM property_units u
  JOIN properties p ON u.property_id = p.id
  WHERE u.id = p_unit_id;
  
  IF v_unit IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unit not found');
  END IF;
  
  -- Check if the current user is the landlord
  IF v_unit.landlord_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;
  
  -- Update the unit with listed_date logic
  UPDATE property_units
  SET 
    on_market = p_on_market,
    status = CASE WHEN p_on_market THEN 'available' ELSE 'unavailable' END,
    available_date = COALESCE(p_available_date, available_date),
    rent_amount = COALESCE(p_rent_amount, rent_amount),
    listed_date = CASE 
      WHEN p_on_market = TRUE AND listed_date IS NULL THEN NOW()
      WHEN p_on_market = FALSE THEN NULL
      ELSE listed_date 
    END,
    updated_at = NOW()
  WHERE id = p_unit_id;
  
  RETURN json_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'on_market', p_on_market
  );
END;
$$;