-- Fix admin_set_property_market_status function to use correct admin check
-- The function was incorrectly checking for 'admin' in account_roles, but 'admin' is not a valid account_role_type enum value
-- This fix uses the is_admin() function which properly checks the system_admins table

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
  v_current_tenant_id UUID;
  v_unit_record RECORD;
BEGIN
  -- FIXED: Use is_admin() function instead of checking account_roles for invalid 'admin' enum
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN QUERY SELECT false, 'Unauthorized: Admin access required'::TEXT, NULL::UUID, NULL::BOOLEAN, NULL::TEXT;
    RETURN;
  END IF;

  -- Get property details
  SELECT p.current_tenant_id
  INTO v_current_tenant_id
  FROM properties p
  WHERE p.id = p_property_id;

  IF v_current_tenant_id IS NULL AND NOT FOUND THEN
    RETURN QUERY SELECT false, 'Property not found'::TEXT, NULL::UUID, NULL::BOOLEAN, NULL::TEXT;
    RETURN;
  END IF;

  -- Determine new status based on market setting and occupancy
  IF p_on_market THEN
    v_new_status := 'available';
  ELSE
    IF v_current_tenant_id IS NOT NULL THEN
      v_new_status := 'occupied';
    ELSE
      v_new_status := 'vacant';
    END IF;
  END IF;

  -- Update the property
  UPDATE properties
  SET 
    on_market = p_on_market,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_property_id;

  -- Update all units for this property
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

  -- Log admin action
  INSERT INTO admin_action_logs (admin_user_id, action, resource_type, resource_id, reason, details)
  VALUES (auth.uid(), 'set_property_market_status', 'property', p_property_id, p_reason,
    jsonb_build_object('on_market', p_on_market, 'new_status', v_new_status, 'metadata', p_metadata));

  -- If unlisting, reject pending applications for all units
  IF NOT p_on_market THEN
    FOR v_unit_record IN SELECT id FROM property_units WHERE property_id = p_property_id LOOP
      PERFORM reject_unit_applications_on_delist(v_unit_record.id, 'Property taken off market by admin: ' || p_reason);
    END LOOP;
  END IF;

  RETURN QUERY SELECT true, 'Property market status updated successfully'::TEXT, p_property_id, p_on_market, v_new_status;
END;
$$;