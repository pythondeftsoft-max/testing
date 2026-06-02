-- Add listed_date column to track when units are put on market
ALTER TABLE property_units 
ADD COLUMN listed_date TIMESTAMP WITH TIME ZONE;

-- Update existing on-market units to have a listed_date
UPDATE property_units
SET listed_date = updated_at
WHERE on_market = true AND listed_date IS NULL;

-- Create or replace the toggle_unit_market_listing function with listed_date tracking
CREATE OR REPLACE FUNCTION toggle_unit_market_listing(
  p_unit_id UUID,
  p_on_market BOOLEAN,
  p_listing_data JSONB DEFAULT '{}'::jsonb,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unit RECORD;
  v_any_units_on_market BOOLEAN;
  v_result JSONB;
BEGIN
  -- Get unit and property info (use property_units, not units)
  SELECT u.*, p.landlord_id, p.id as property_id
  INTO v_unit
  FROM property_units u
  JOIN properties p ON u.property_id = p.id
  WHERE u.id = p_unit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  IF p_user_id IS NOT NULL AND v_unit.landlord_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this unit';
  END IF;

  -- Update unit with listed_date tracking
  UPDATE property_units
  SET 
    on_market = p_on_market,
    listed_date = CASE 
      WHEN p_on_market THEN NOW()
      ELSE NULL
    END,
    listing_data = CASE 
      WHEN p_on_market THEN p_listing_data
      ELSE listing_data
    END,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Check if any units in property are on market
  SELECT EXISTS(
    SELECT 1 FROM property_units
    WHERE property_id = v_unit.property_id
    AND on_market = true
  ) INTO v_any_units_on_market;

  -- Update parent property status
  UPDATE properties
  SET 
    status = CASE
      WHEN v_any_units_on_market THEN 'available'
      ELSE CASE
        WHEN EXISTS (
          SELECT 1 FROM property_tenant_requests
          WHERE property_id = v_unit.property_id
          AND status = 'approved'
          LIMIT 1
        ) THEN status
        ELSE 'vacant'
      END
    END,
    on_market = v_any_units_on_market,
    updated_at = NOW()
  WHERE id = v_unit.property_id;

  v_result := jsonb_build_object(
    'success', true,
    'unit_id', p_unit_id,
    'property_id', v_unit.property_id,
    'on_market', p_on_market,
    'message', CASE 
      WHEN p_on_market THEN 'Unit listed on market'
      ELSE 'Unit removed from market'
    END
  );

  RETURN v_result;
END;
$$;