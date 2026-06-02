-- Drop existing functions first
DROP FUNCTION IF EXISTS toggle_property_market_listing(UUID, BOOLEAN, JSONB, UUID);
DROP FUNCTION IF EXISTS toggle_unit_market_listing(UUID, BOOLEAN, JSONB, UUID);

-- Recreate toggle_property_market_listing to sync status with on_market
CREATE OR REPLACE FUNCTION toggle_property_market_listing(
  p_property_id UUID,
  p_on_market BOOLEAN,
  p_listing_data JSONB DEFAULT '{}'::jsonb,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property RECORD;
  v_result JSONB;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_property
  FROM properties
  WHERE id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  IF p_user_id IS NOT NULL AND v_property.landlord_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this property';
  END IF;

  -- Sync status with on_market
  IF p_on_market THEN
    v_new_status := 'available';
  ELSE
    IF EXISTS (
      SELECT 1 FROM property_tenant_requests
      WHERE property_id = p_property_id
      AND status = 'approved'
      LIMIT 1
    ) THEN
      v_new_status := v_property.status;
    ELSE
      v_new_status := 'vacant';
    END IF;
  END IF;

  UPDATE properties
  SET 
    on_market = p_on_market,
    status = v_new_status,
    listing_data = CASE 
      WHEN p_on_market THEN p_listing_data
      ELSE listing_data
    END,
    updated_at = NOW()
  WHERE id = p_property_id;

  v_result := jsonb_build_object(
    'success', true,
    'property_id', p_property_id,
    'on_market', p_on_market,
    'status', v_new_status,
    'message', CASE 
      WHEN p_on_market THEN 'Property listed on market'
      ELSE 'Property removed from market'
    END
  );

  RETURN v_result;
END;
$$;

-- Recreate toggle_unit_market_listing to sync parent property status
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
  SELECT u.*, p.landlord_id, p.id as property_id
  INTO v_unit
  FROM units u
  JOIN properties p ON u.property_id = p.id
  WHERE u.id = p_unit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  IF p_user_id IS NOT NULL AND v_unit.landlord_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this unit';
  END IF;

  UPDATE units
  SET 
    on_market = p_on_market,
    listing_data = CASE 
      WHEN p_on_market THEN p_listing_data
      ELSE listing_data
    END,
    updated_at = NOW()
  WHERE id = p_unit_id;

  SELECT EXISTS(
    SELECT 1 FROM units
    WHERE property_id = v_unit.property_id
    AND on_market = true
  ) INTO v_any_units_on_market;

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

-- Fix existing inconsistent data
UPDATE properties
SET status = 'available'
WHERE on_market = true
AND status != 'available';

UPDATE properties
SET status = 'vacant'
WHERE on_market = false
AND status = 'available'
AND NOT EXISTS (
  SELECT 1 FROM property_tenant_requests
  WHERE property_tenant_requests.property_id = properties.id
  AND property_tenant_requests.status = 'approved'
);