-- Fix admin_set_unit_market_status function to use correct admin check
-- The function was incorrectly checking for 'admin' in account_roles, but 'admin' is not a valid account_role_type enum value
-- This fix uses the is_admin() function which properly checks the system_admins table

CREATE OR REPLACE FUNCTION admin_set_unit_market_status(
  p_unit_id UUID,
  p_on_market BOOLEAN,
  p_reason TEXT DEFAULT 'Admin override',
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  unit_id UUID,
  property_id UUID,
  on_market BOOLEAN,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id UUID;
  v_new_status TEXT;
  v_current_tenant_id UUID;
BEGIN
  -- FIXED: Use is_admin() function instead of checking account_roles for invalid 'admin' enum
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN QUERY SELECT false, 'Unauthorized: Admin access required'::TEXT, NULL::UUID, NULL::UUID, NULL::BOOLEAN, NULL::TEXT;
    RETURN;
  END IF;

  -- Get unit details
  SELECT pu.property_id, pu.current_tenant_id
  INTO v_property_id, v_current_tenant_id
  FROM property_units pu
  WHERE pu.id = p_unit_id;

  IF v_property_id IS NULL THEN
    RETURN QUERY SELECT false, 'Unit not found'::TEXT, NULL::UUID, NULL::UUID, NULL::BOOLEAN, NULL::TEXT;
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

  -- Update the unit
  UPDATE property_units
  SET 
    on_market = p_on_market,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_unit_id;

  -- Log admin action
  INSERT INTO admin_action_logs (admin_user_id, action, resource_type, resource_id, reason, details)
  VALUES (auth.uid(), 'set_unit_market_status', 'property_unit', p_unit_id, p_reason,
    jsonb_build_object('on_market', p_on_market, 'new_status', v_new_status, 'metadata', p_metadata));

  -- If unlisting, reject pending applications
  IF NOT p_on_market THEN
    PERFORM reject_unit_applications_on_delist(p_unit_id, 'Property taken off market by admin: ' || p_reason);
  END IF;

  RETURN QUERY SELECT true, 'Unit market status updated successfully'::TEXT, p_unit_id, v_property_id, p_on_market, v_new_status;
END;
$$;