-- Fix toggle_property_market_listing to use owner_id instead of landlord_id
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

  -- FIX: Changed landlord_id to owner_id
  IF p_user_id IS NOT NULL AND v_property.owner_id != p_user_id THEN
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