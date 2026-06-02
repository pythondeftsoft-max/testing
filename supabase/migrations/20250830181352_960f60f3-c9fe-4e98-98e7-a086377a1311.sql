-- Create admin properties overview RPC
CREATE OR REPLACE FUNCTION public.admin_get_properties_overview()
RETURNS TABLE(
  id uuid,
  address text,
  city text,
  state text,
  zipcode text,
  monthly_rent numeric,
  property_type text,
  status text,
  occupancy_status text,
  on_market boolean,
  unit_count integer,
  created_at timestamp with time zone,
  owner_id uuid,
  portfolio_id uuid,
  tenant_request_count integer,
  maintenance_requests_count integer,
  lease_end_date date,
  has_tenant boolean,
  tenant_info jsonb,
  supports_tenant_management boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(p.street_address, p.address) as address,
    p.city,
    p.state,
    p.zipcode,
    p.monthly_rent,
    p.property_type::text,
    p.status::text,
    p.occupancy_status::text,
    p.on_market,
    p.unit_count,
    p.created_at,
    p.owner_id,
    p.portfolio_id,
    COALESCE(ptr_count.count, 0)::integer as tenant_request_count,
    COALESCE(mr_count.count, 0)::integer as maintenance_requests_count,
    p.lease_end_date,
    CASE WHEN approved_app.tenant_id IS NOT NULL THEN true ELSE false END as has_tenant,
    CASE 
      WHEN approved_app.tenant_id IS NOT NULL THEN
        jsonb_build_object(
          'tenant_id', approved_app.tenant_id,
          'tenant_name', CONCAT(prof.first_name, ' ', prof.last_name),
          'tenant_email', users.email,
          'approved_at', approved_app.created_at,
          'application_id', approved_app.id
        )
      ELSE NULL
    END as tenant_info,
    CASE WHEN p.property_type = 'commercial' THEN false ELSE true END as supports_tenant_management
  FROM properties p
  LEFT JOIN (
    SELECT property_id, COUNT(*) as count
    FROM property_tenant_requests
    WHERE status = 'active'
    GROUP BY property_id
  ) ptr_count ON p.id = ptr_count.property_id
  LEFT JOIN (
    SELECT property_id, COUNT(*) as count
    FROM maintenance_requests
    WHERE status != 'completed'
    GROUP BY property_id
  ) mr_count ON p.id = mr_count.property_id
  LEFT JOIN (
    SELECT DISTINCT ON (property_id) property_id, tenant_id, created_at, id
    FROM property_applications
    WHERE status = 'approved'
    ORDER BY property_id, created_at DESC
  ) approved_app ON p.id = approved_app.property_id
  LEFT JOIN profiles prof ON approved_app.tenant_id = prof.id
  LEFT JOIN auth.users users ON approved_app.tenant_id = users.id
  WHERE p.deleted_at IS NULL
  ORDER BY p.created_at DESC;
END;
$$;

-- Create admin set property market status RPC
CREATE OR REPLACE FUNCTION public.admin_set_property_market_status(
  p_property_id uuid,
  p_on_market boolean,
  p_reason text DEFAULT 'Admin override',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  -- Update property market status
  UPDATE properties 
  SET 
    on_market = p_on_market,
    updated_at = now()
  WHERE id = p_property_id;

  -- Log the admin action
  INSERT INTO admin_audit_logs (
    admin_id,
    action_type,
    resource_type,
    resource_id,
    details,
    metadata
  ) VALUES (
    auth.uid(),
    'set_market_status',
    'property',
    p_property_id,
    jsonb_build_object(
      'on_market', p_on_market,
      'reason', p_reason
    ),
    p_metadata
  );

  RETURN true;
END;
$$;

-- Create admin remove property tenant RPC
CREATE OR REPLACE FUNCTION public.admin_remove_property_tenant(
  p_property_id uuid,
  p_reason text DEFAULT 'Admin tenant removal',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_record RECORD;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  -- Get current tenant info for logging
  SELECT pa.tenant_id, pa.id as application_id, prof.first_name, prof.last_name
  INTO tenant_record
  FROM property_applications pa
  JOIN profiles prof ON pa.tenant_id = prof.id
  WHERE pa.property_id = p_property_id AND pa.status = 'approved'
  LIMIT 1;

  -- Remove approved applications
  UPDATE property_applications 
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE property_id = p_property_id AND status = 'approved';

  -- Update property to vacant
  UPDATE properties 
  SET 
    occupancy_status = 'vacant',
    on_market = false,
    updated_at = now()
  WHERE id = p_property_id;

  -- Deactivate any active rent splits
  UPDATE rent_splits
  SET is_active = false
  WHERE property_id = p_property_id AND is_active = true;

  -- Log the admin action
  INSERT INTO admin_audit_logs (
    admin_id,
    action_type,
    resource_type,
    resource_id,
    details,
    metadata
  ) VALUES (
    auth.uid(),
    'remove_tenant',
    'property',
    p_property_id,
    jsonb_build_object(
      'reason', p_reason,
      'removed_tenant_id', tenant_record.tenant_id,
      'removed_tenant_name', CONCAT(tenant_record.first_name, ' ', tenant_record.last_name),
      'application_id', tenant_record.application_id
    ),
    p_metadata
  );

  RETURN true;
END;
$$;

-- Create admin switch property tenant RPC
CREATE OR REPLACE FUNCTION public.admin_switch_property_tenant(
  p_property_id uuid,
  p_new_tenant_email text,
  p_reason text DEFAULT 'Admin tenant switch',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_tenant_record RECORD;
  new_tenant_id uuid;
  result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  -- Get current tenant info
  SELECT pa.tenant_id, pa.id as application_id, prof.first_name, prof.last_name
  INTO old_tenant_record
  FROM property_applications pa
  JOIN profiles prof ON pa.tenant_id = prof.id
  WHERE pa.property_id = p_property_id AND pa.status = 'approved'
  LIMIT 1;

  -- Find new tenant by email
  SELECT users.id INTO new_tenant_id
  FROM auth.users users
  WHERE users.email = p_new_tenant_email;

  IF new_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found with email: ' || p_new_tenant_email
    );
  END IF;

  -- Check if new tenant exists in profiles
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = new_tenant_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found for: ' || p_new_tenant_email
    );
  END IF;

  -- Remove old tenant (cancel existing applications)
  UPDATE property_applications 
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE property_id = p_property_id AND status = 'approved';

  -- Create new approved application for new tenant
  INSERT INTO property_applications (
    property_id,
    tenant_id,
    status,
    application_data,
    created_at,
    updated_at
  ) VALUES (
    p_property_id,
    new_tenant_id,
    'approved',
    jsonb_build_object(
      'admin_switch', true,
      'reason', p_reason,
      'switched_by', auth.uid(),
      'switched_at', now()
    ),
    now(),
    now()
  );

  -- Update property to occupied
  UPDATE properties 
  SET 
    occupancy_status = 'occupied',
    updated_at = now()
  WHERE id = p_property_id;

  -- Deactivate old rent splits
  UPDATE rent_splits
  SET is_active = false
  WHERE property_id = p_property_id AND is_active = true;

  -- Log the admin action
  INSERT INTO admin_audit_logs (
    admin_id,
    action_type,
    resource_type,
    resource_id,
    details,
    metadata
  ) VALUES (
    auth.uid(),
    'switch_tenant',
    'property',
    p_property_id,
    jsonb_build_object(
      'reason', p_reason,
      'old_tenant_id', old_tenant_record.tenant_id,
      'old_tenant_name', CONCAT(old_tenant_record.first_name, ' ', old_tenant_record.last_name),
      'new_tenant_id', new_tenant_id,
      'new_tenant_email', p_new_tenant_email
    ),
    p_metadata
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Tenant switched successfully'
  );
END;
$$;

-- Add index for better performance on property applications
CREATE INDEX IF NOT EXISTS idx_property_applications_property_status 
ON property_applications(property_id, status) 
WHERE status = 'approved';