-- Update the 2-arg TABLE-returning overload to add push cleanup
CREATE OR REPLACE FUNCTION toggle_property_market_listing(
  p_property_id UUID,
  p_on_market BOOLEAN
)
RETURNS TABLE(success BOOLEAN, message TEXT, property_id UUID, on_market BOOLEAN, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord_id UUID;
  v_new_status TEXT;
  v_current_tenant_id UUID;
  v_unit_record RECORD;
BEGIN
  SELECT p.landlord_id, p.current_tenant_id
  INTO v_landlord_id, v_current_tenant_id
  FROM properties p
  WHERE p.id = p_property_id;

  IF v_landlord_id IS NULL THEN
    RETURN QUERY SELECT false, 'Property not found'::TEXT, NULL::UUID, NULL::BOOLEAN, NULL::TEXT;
    RETURN;
  END IF;

  IF auth.uid() != v_landlord_id THEN
    RETURN QUERY SELECT false, 'Unauthorized'::TEXT, NULL::UUID, NULL::BOOLEAN, NULL::TEXT;
    RETURN;
  END IF;

  IF p_on_market THEN
    v_new_status := 'available';
  ELSE
    IF v_current_tenant_id IS NOT NULL THEN
      v_new_status := 'occupied';
    ELSE
      v_new_status := 'vacant';
    END IF;
  END IF;

  UPDATE properties
  SET on_market = p_on_market, status = v_new_status, updated_at = NOW()
  WHERE id = p_property_id;

  UPDATE property_units
  SET 
    on_market = p_on_market,
    status = CASE 
      WHEN p_on_market THEN 'available'
      WHEN current_tenant_id IS NOT NULL THEN 'occupied'
      ELSE 'vacant'
    END,
    updated_at = NOW()
  WHERE property_id = p_property_id;

  IF NOT p_on_market THEN
    FOR v_unit_record IN SELECT id FROM property_units WHERE property_id = p_property_id LOOP
      PERFORM reject_unit_applications_on_delist(v_unit_record.id, 'Property taken off market by landlord');
    END LOOP;

    DELETE FROM property_pushes pp
    WHERE pp.property_id = p_property_id
      AND pp.status NOT IN ('denied');
  END IF;

  RETURN QUERY SELECT true, 'Market status updated successfully'::TEXT, p_property_id, p_on_market, v_new_status;
END;
$$;