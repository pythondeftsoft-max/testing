-- Drop existing functions to allow recreation with new return types
DROP FUNCTION IF EXISTS admin_set_unit_market_status(UUID, BOOLEAN, TEXT, JSONB);
DROP FUNCTION IF EXISTS admin_set_property_market_status(UUID, BOOLEAN, TEXT, JSONB);
DROP FUNCTION IF EXISTS toggle_unit_market_listing(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS toggle_property_market_listing(UUID, BOOLEAN);

-- Create function to reject all pending applications for a unit when it's taken off market
CREATE OR REPLACE FUNCTION reject_unit_applications_on_delist(
  p_unit_id UUID,
  p_reason TEXT DEFAULT 'Property taken off market'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Withdraw property_applications
  UPDATE property_applications
  SET 
    status = 'withdrawn',
    withdrawn_at = NOW(),
    withdrawn_reason = p_reason
  WHERE unit_id = p_unit_id
    AND status IN ('submitted', 'pending', 'draft')
    AND withdrawn_at IS NULL;

  -- Withdraw marketplace_applications
  UPDATE marketplace_applications
  SET 
    status = 'withdrawn',
    withdrawn_at = NOW(),
    withdrawn_reason = p_reason
  WHERE unit_id = p_unit_id
    AND status IN ('submitted', 'pending', 'draft')
    AND withdrawn_at IS NULL;

  -- Reset unit applications pipeline data
  UPDATE unit_applications
  SET 
    pipeline_stage = 'unassigned',
    is_primary_applicant = false
  WHERE unit_id = p_unit_id;
END;
$$;

-- Recreate toggle_unit_market_listing with application rejection
CREATE OR REPLACE FUNCTION toggle_unit_market_listing(
  p_unit_id UUID,
  p_on_market BOOLEAN
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
AS $$
DECLARE
  v_property_id UUID;
  v_landlord_id UUID;
  v_new_status TEXT;
  v_current_tenant_id UUID;
BEGIN
  SELECT pu.property_id, p.landlord_id, pu.current_tenant_id
  INTO v_property_id, v_landlord_id, v_current_tenant_id
  FROM property_units pu
  JOIN properties p ON p.id = pu.property_id
  WHERE pu.id = p_unit_id;

  IF v_property_id IS NULL THEN
    RETURN QUERY SELECT false, 'Unit not found'::TEXT, NULL::UUID, NULL::UUID, NULL::BOOLEAN, NULL::TEXT;
    RETURN;
  END IF;

  IF auth.uid() != v_landlord_id THEN
    RETURN QUERY SELECT false, 'Unauthorized'::TEXT, NULL::UUID, NULL::UUID, NULL::BOOLEAN, NULL::TEXT;
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

  UPDATE property_units
  SET 
    on_market = p_on_market,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_unit_id;

  IF NOT p_on_market THEN
    PERFORM reject_unit_applications_on_delist(p_unit_id, 'Property taken off market by landlord');
  END IF;

  RETURN QUERY SELECT true, 'Market status updated successfully'::TEXT, p_unit_id, v_property_id, p_on_market, v_new_status;
END;
$$;

-- Recreate toggle_property_market_listing with application rejection
CREATE OR REPLACE FUNCTION toggle_property_market_listing(
  p_property_id UUID,
  p_on_market BOOLEAN
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
  SET 
    on_market = p_on_market,
    status = v_new_status,
    updated_at = NOW()
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
  END IF;

  RETURN QUERY SELECT true, 'Market status updated successfully'::TEXT, p_property_id, p_on_market, v_new_status;
END;
$$;

-- Recreate admin_set_unit_market_status with application rejection
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
AS $$
DECLARE
  v_property_id UUID;
  v_new_status TEXT;
  v_current_tenant_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM account_roles 
    WHERE user_id = auth.uid() 
    AND role_name = 'admin' 
    AND is_active = true
  ) THEN
    RETURN QUERY SELECT false, 'Unauthorized: Admin access required'::TEXT, NULL::UUID, NULL::UUID, NULL::BOOLEAN, NULL::TEXT;
    RETURN;
  END IF;

  SELECT pu.property_id, pu.current_tenant_id
  INTO v_property_id, v_current_tenant_id
  FROM property_units pu
  WHERE pu.id = p_unit_id;

  IF v_property_id IS NULL THEN
    RETURN QUERY SELECT false, 'Unit not found'::TEXT, NULL::UUID, NULL::UUID, NULL::BOOLEAN, NULL::TEXT;
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

  UPDATE property_units
  SET 
    on_market = p_on_market,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_unit_id;

  INSERT INTO admin_action_logs (admin_user_id, action, resource_type, resource_id, reason, details)
  VALUES (auth.uid(), 'set_unit_market_status', 'property_unit', p_unit_id, p_reason,
    jsonb_build_object('on_market', p_on_market, 'new_status', v_new_status, 'metadata', p_metadata));

  IF NOT p_on_market THEN
    PERFORM reject_unit_applications_on_delist(p_unit_id, 'Property taken off market by admin: ' || p_reason);
  END IF;

  RETURN QUERY SELECT true, 'Unit market status updated successfully'::TEXT, p_unit_id, v_property_id, p_on_market, v_new_status;
END;
$$;

-- Recreate admin_set_property_market_status with application rejection
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
AS $$
DECLARE
  v_new_status TEXT;
  v_current_tenant_id UUID;
  v_unit_record RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM account_roles 
    WHERE user_id = auth.uid() 
    AND role_name = 'admin' 
    AND is_active = true
  ) THEN
    RETURN QUERY SELECT false, 'Unauthorized: Admin access required'::TEXT, NULL::UUID, NULL::BOOLEAN, NULL::TEXT;
    RETURN;
  END IF;

  SELECT p.current_tenant_id
  INTO v_current_tenant_id
  FROM properties p
  WHERE p.id = p_property_id;

  IF v_current_tenant_id IS NULL AND NOT FOUND THEN
    RETURN QUERY SELECT false, 'Property not found'::TEXT, NULL::UUID, NULL::BOOLEAN, NULL::TEXT;
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
  SET 
    on_market = p_on_market,
    status = v_new_status,
    updated_at = NOW()
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

  INSERT INTO admin_action_logs (admin_user_id, action, resource_type, resource_id, reason, details)
  VALUES (auth.uid(), 'set_property_market_status', 'property', p_property_id, p_reason,
    jsonb_build_object('on_market', p_on_market, 'new_status', v_new_status, 'metadata', p_metadata));

  IF NOT p_on_market THEN
    FOR v_unit_record IN SELECT id FROM property_units WHERE property_id = p_property_id LOOP
      PERFORM reject_unit_applications_on_delist(v_unit_record.id, 'Property taken off market by admin: ' || p_reason);
    END LOOP;
  END IF;

  RETURN QUERY SELECT true, 'Property market status updated successfully'::TEXT, p_property_id, p_on_market, v_new_status;
END;
$$;