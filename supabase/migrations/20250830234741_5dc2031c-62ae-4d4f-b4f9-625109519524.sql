-- Admin Property Management Functions
-- These functions provide comprehensive admin control over properties

-- 1. Admin soft delete property with audit trail
CREATE OR REPLACE FUNCTION admin_soft_delete_property(
  p_property_id UUID,
  p_reason TEXT DEFAULT 'Admin soft delete via dashboard',
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_data JSONB;
  v_related_data JSONB;
BEGIN
  -- Check admin permissions
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Check if property exists and is not already deleted
  SELECT to_jsonb(p.*) INTO v_property_data
  FROM properties p 
  WHERE p.id = p_property_id AND p.deleted_at IS NULL;

  IF v_property_data IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Property not found or already deleted'::TEXT;
    RETURN;
  END IF;

  -- Collect related data for audit trail
  SELECT jsonb_build_object(
    'property_applications', (SELECT jsonb_agg(to_jsonb(pa.*)) FROM property_applications pa WHERE pa.property_id = p_property_id),
    'property_units', (SELECT jsonb_agg(to_jsonb(pu.*)) FROM property_units pu WHERE pu.property_id = p_property_id),
    'maintenance_requests', (SELECT jsonb_agg(to_jsonb(mr.*)) FROM maintenance_requests mr WHERE mr.property_id = p_property_id),
    'rent_payments', (SELECT jsonb_agg(to_jsonb(rp.*)) FROM rent_payments rp WHERE rp.property_id = p_property_id),
    'viewing_appointments', (SELECT jsonb_agg(to_jsonb(va.*)) FROM viewing_appointments va WHERE va.property_id = p_property_id)
  ) INTO v_related_data;

  -- Store deleted property data
  INSERT INTO deleted_properties (
    original_property_id,
    property_data,
    related_data,
    deleted_by
  ) VALUES (
    p_property_id,
    v_property_data,
    v_related_data,
    auth.uid()
  );

  -- Soft delete the property
  UPDATE properties 
  SET status = 'deleted',
      deleted_at = now(),
      deleted_by = auth.uid()
  WHERE id = p_property_id;

  -- Log admin action
  INSERT INTO rbac_event_logs (
    user_id, scope, object, action, allowed, metadata
  ) VALUES (
    auth.uid(), 'property', p_property_id::TEXT, 'soft_delete', TRUE,
    jsonb_build_object(
      'reason', p_reason,
      'admin_metadata', p_metadata,
      'timestamp', now()
    )
  );

  RETURN QUERY SELECT TRUE, 'Property soft deleted successfully'::TEXT;
END;
$$;

-- 2. Admin restore property
CREATE OR REPLACE FUNCTION admin_restore_property(
  p_property_id UUID,
  p_reason TEXT DEFAULT 'Admin restore via dashboard',
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin permissions
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Check if property exists and is deleted
  IF NOT EXISTS (SELECT 1 FROM properties WHERE id = p_property_id AND deleted_at IS NOT NULL) THEN
    RETURN QUERY SELECT FALSE, 'Property not found or not deleted'::TEXT;
    RETURN;
  END IF;

  -- Restore the property
  UPDATE properties 
  SET status = 'available',
      deleted_at = NULL,
      deleted_by = NULL
  WHERE id = p_property_id;

  -- Mark as restored in deleted_properties table if exists
  UPDATE deleted_properties 
  SET restored_at = now(),
      restored_by = auth.uid()
  WHERE original_property_id = p_property_id
    AND restored_at IS NULL;

  -- Log admin action
  INSERT INTO rbac_event_logs (
    user_id, scope, object, action, allowed, metadata
  ) VALUES (
    auth.uid(), 'property', p_property_id::TEXT, 'restore', TRUE,
    jsonb_build_object(
      'reason', p_reason,
      'admin_metadata', p_metadata,
      'timestamp', now()
    )
  );

  RETURN QUERY SELECT TRUE, 'Property restored successfully'::TEXT;
END;
$$;

-- 3. Admin transfer property ownership
CREATE OR REPLACE FUNCTION admin_transfer_property_ownership(
  p_property_id UUID,
  p_new_owner_id UUID,
  p_new_portfolio_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Admin ownership transfer via dashboard',
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_owner_id UUID;
  v_old_portfolio_id UUID;
BEGIN
  -- Check admin permissions
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get current ownership details
  SELECT owner_id, portfolio_id INTO v_old_owner_id, v_old_portfolio_id
  FROM properties 
  WHERE id = p_property_id AND deleted_at IS NULL;

  IF v_old_owner_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Property not found or deleted'::TEXT;
    RETURN;
  END IF;

  -- Verify new owner exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_new_owner_id) THEN
    RETURN QUERY SELECT FALSE, 'New owner not found'::TEXT;
    RETURN;
  END IF;

  -- Verify new portfolio exists if provided
  IF p_new_portfolio_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM portfolios WHERE id = p_new_portfolio_id) THEN
    RETURN QUERY SELECT FALSE, 'New portfolio not found'::TEXT;
    RETURN;
  END IF;

  -- Transfer ownership
  UPDATE properties 
  SET owner_id = p_new_owner_id,
      portfolio_id = p_new_portfolio_id,
      updated_at = now()
  WHERE id = p_property_id;

  -- Log admin action
  INSERT INTO rbac_event_logs (
    user_id, scope, object, action, allowed, metadata
  ) VALUES (
    auth.uid(), 'property', p_property_id::TEXT, 'transfer_ownership', TRUE,
    jsonb_build_object(
      'reason', p_reason,
      'old_owner_id', v_old_owner_id,
      'new_owner_id', p_new_owner_id,
      'old_portfolio_id', v_old_portfolio_id,
      'new_portfolio_id', p_new_portfolio_id,
      'admin_metadata', p_metadata,
      'timestamp', now()
    )
  );

  RETURN QUERY SELECT TRUE, 'Property ownership transferred successfully'::TEXT;
END;
$$;

-- 4. Admin batch update properties
CREATE OR REPLACE FUNCTION admin_batch_update_properties(
  p_property_ids UUID[],
  p_updates JSONB,
  p_reason TEXT DEFAULT 'Admin batch update via dashboard',
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(success BOOLEAN, message TEXT, updated_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_property_id UUID;
  v_sql TEXT := 'UPDATE properties SET ';
  v_set_clauses TEXT[] := ARRAY[]::TEXT[];
  v_key TEXT;
  v_value TEXT;
BEGIN
  -- Check admin permissions
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Validate inputs
  IF array_length(p_property_ids, 1) IS NULL OR array_length(p_property_ids, 1) = 0 THEN
    RETURN QUERY SELECT FALSE, 'No property IDs provided'::TEXT, 0;
    RETURN;
  END IF;

  IF p_updates IS NULL OR p_updates = '{}'::JSONB THEN
    RETURN QUERY SELECT FALSE, 'No updates provided'::TEXT, 0;
    RETURN;
  END IF;

  -- Build dynamic update query (safe fields only)
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_updates) LOOP
    CASE v_key
      WHEN 'status' THEN
        IF v_value IN ('available', 'occupied', 'vacant', 'maintenance', 'for_sale', 'under_contract') THEN
          v_set_clauses := array_append(v_set_clauses, format('status = %L', v_value));
        END IF;
      WHEN 'on_market' THEN
        IF v_value IN ('true', 'false') THEN
          v_set_clauses := array_append(v_set_clauses, format('on_market = %L::BOOLEAN', v_value));
        END IF;
      WHEN 'monthly_rent' THEN
        IF v_value ~ '^\d+(\.\d+)?$' THEN
          v_set_clauses := array_append(v_set_clauses, format('monthly_rent = %L::NUMERIC', v_value));
        END IF;
      WHEN 'portfolio_id' THEN
        IF v_value = 'null' OR v_value = '' THEN
          v_set_clauses := array_append(v_set_clauses, 'portfolio_id = NULL');
        ELSE
          v_set_clauses := array_append(v_set_clauses, format('portfolio_id = %L::UUID', v_value));
        END IF;
    END CASE;
  END LOOP;

  -- Check if we have valid updates
  IF array_length(v_set_clauses, 1) IS NULL OR array_length(v_set_clauses, 1) = 0 THEN
    RETURN QUERY SELECT FALSE, 'No valid updates provided'::TEXT, 0;
    RETURN;
  END IF;

  -- Add updated_at timestamp
  v_set_clauses := array_append(v_set_clauses, 'updated_at = now()');

  -- Complete the SQL
  v_sql := v_sql || array_to_string(v_set_clauses, ', ') || 
           ' WHERE id = ANY($1) AND deleted_at IS NULL';

  -- Execute the update
  EXECUTE v_sql USING p_property_ids;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Log admin action for each property
  FOREACH v_property_id IN ARRAY p_property_ids LOOP
    INSERT INTO rbac_event_logs (
      user_id, scope, object, action, allowed, metadata
    ) VALUES (
      auth.uid(), 'property', v_property_id::TEXT, 'batch_update', TRUE,
      jsonb_build_object(
        'reason', p_reason,
        'updates_applied', p_updates,
        'batch_size', array_length(p_property_ids, 1),
        'admin_metadata', p_metadata,
        'timestamp', now()
      )
    );
  END LOOP;

  RETURN QUERY SELECT TRUE, format('Successfully updated %s properties', v_updated_count)::TEXT, v_updated_count;
END;
$$;

-- 5. Admin delete unit (for property units)
CREATE OR REPLACE FUNCTION admin_delete_unit(
  p_unit_id UUID,
  p_reason TEXT DEFAULT 'Admin unit delete via dashboard',
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_id UUID;
  v_unit_data JSONB;
BEGIN
  -- Check admin permissions
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get unit data and property ID
  SELECT property_id, to_jsonb(pu.*) INTO v_property_id, v_unit_data
  FROM property_units pu 
  WHERE pu.id = p_unit_id;

  IF v_unit_data IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Unit not found'::TEXT;
    RETURN;
  END IF;

  -- Check if unit has active applications or tenants
  IF EXISTS (
    SELECT 1 FROM unit_applications ua 
    WHERE ua.unit_id = p_unit_id 
    AND ua.status = 'approved'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Cannot delete unit with active tenant or applications'::TEXT;
    RETURN;
  END IF;

  -- Delete the unit
  DELETE FROM property_units WHERE id = p_unit_id;

  -- Log admin action
  INSERT INTO rbac_event_logs (
    user_id, scope, object, action, allowed, metadata
  ) VALUES (
    auth.uid(), 'unit', p_unit_id::TEXT, 'delete', TRUE,
    jsonb_build_object(
      'reason', p_reason,
      'property_id', v_property_id,
      'unit_data', v_unit_data,
      'admin_metadata', p_metadata,
      'timestamp', now()
    )
  );

  RETURN QUERY SELECT TRUE, 'Unit deleted successfully'::TEXT;
END;
$$;

-- 6. Admin get property audit trail
CREATE OR REPLACE FUNCTION admin_get_property_audit_trail(
  p_property_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  log_id UUID,
  user_id UUID,
  action TEXT,
  allowed BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  user_name TEXT,
  user_email TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Check admin permissions
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    rel.id,
    rel.user_id,
    rel.action,
    rel.allowed,
    rel.metadata,
    rel.created_at,
    CONCAT(p.first_name, ' ', p.last_name) as user_name,
    au.email::TEXT as user_email
  FROM rbac_event_logs rel
  LEFT JOIN profiles p ON rel.user_id = p.id
  LEFT JOIN auth.users au ON rel.user_id = au.id
  WHERE rel.scope = 'property' 
    AND rel.object = p_property_id::TEXT
  ORDER BY rel.created_at DESC
  LIMIT p_limit;
END;
$$;