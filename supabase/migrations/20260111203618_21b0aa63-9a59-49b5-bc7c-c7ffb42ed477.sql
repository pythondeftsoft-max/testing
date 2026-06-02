-- Fix ambiguous property_id column reference in admin_set_property_market_status
-- The function's RETURNS TABLE includes property_id, conflicting with property_units.property_id

CREATE OR REPLACE FUNCTION admin_set_property_market_status(
  p_property_id UUID,
  p_on_market BOOLEAN,
  p_reason TEXT DEFAULT 'Admin override',
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  property_id UUID,
  on_market BOOLEAN,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status TEXT;
  v_has_tenant BOOLEAN;
  v_unit_record RECORD;
BEGIN
  -- Use is_admin() function to check admin status
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN QUERY SELECT false, 'Unauthorized: Admin access required'::TEXT, NULL::UUID, NULL::BOOLEAN, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if property exists
  IF NOT EXISTS (SELECT 1 FROM properties p WHERE p.id = p_property_id) THEN
    RETURN QUERY SELECT false, 'Property not found'::TEXT, NULL::UUID, NULL::BOOLEAN, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if any units have tenants (using alias to avoid ambiguity)
  SELECT EXISTS (
    SELECT 1 FROM property_units pu 
    WHERE pu.property_id = p_property_id AND pu.tenant_id IS NOT NULL
  ) INTO v_has_tenant;

  -- Determine new status based on market setting and occupancy
  IF p_on_market THEN
    v_new_status := 'available';
  ELSE
    IF v_has_tenant THEN
      v_new_status := 'occupied';
    ELSE
      v_new_status := 'vacant';
    END IF;
  END IF;

  -- Update the property
  UPDATE properties p
  SET 
    on_market = p_on_market,
    status = v_new_status,
    updated_at = NOW()
  WHERE p.id = p_property_id;

  -- Update all units for this property (using alias)
  UPDATE property_units pu
  SET 
    on_market = p_on_market,
    status = CASE 
      WHEN p_on_market THEN 'available'
      WHEN pu.tenant_id IS NOT NULL THEN 'occupied'
      ELSE 'vacant'
    END,
    updated_at = NOW()
  WHERE pu.property_id = p_property_id;

  -- Log admin action
  INSERT INTO admin_action_logs (admin_user_id, action, resource_type, resource_id, reason, details)
  VALUES (auth.uid(), 'set_property_market_status', 'property', p_property_id, p_reason,
    jsonb_build_object('on_market', p_on_market, 'new_status', v_new_status, 'metadata', p_metadata));

  -- If unlisting, reject pending applications for all units
  IF NOT p_on_market THEN
    FOR v_unit_record IN SELECT pu.id FROM property_units pu WHERE pu.property_id = p_property_id LOOP
      PERFORM reject_unit_applications_on_delist(v_unit_record.id, 'Property taken off market by admin: ' || p_reason);
    END LOOP;
  END IF;

  RETURN QUERY SELECT true, 'Property market status updated successfully'::TEXT, p_property_id, p_on_market, v_new_status;
END;
$$;