-- Update the JSONB-returning landlord toggle to add push cleanup
CREATE OR REPLACE FUNCTION toggle_property_market_listing(
  p_property_id UUID,
  p_on_market BOOLEAN,
  p_user_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property RECORD;
  v_result JSONB;
  v_new_status TEXT;
  v_unit_record RECORD;
BEGIN
  SELECT * INTO v_property
  FROM properties
  WHERE id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  IF p_user_id IS NOT NULL AND v_property.owner_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this property';
  END IF;

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
    updated_at = NOW()
  WHERE id = p_property_id;

  -- Clean up active pushes when delisting so relisting starts fresh
  IF NOT p_on_market THEN
    FOR v_unit_record IN SELECT id FROM property_units WHERE property_id = p_property_id LOOP
      PERFORM reject_unit_applications_on_delist(v_unit_record.id, 'Property taken off market by landlord');
    END LOOP;

    DELETE FROM property_pushes pp
    WHERE pp.property_id = p_property_id
      AND pp.status NOT IN ('denied');
  END IF;

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