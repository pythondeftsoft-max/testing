-- Drop existing function first
DROP FUNCTION IF EXISTS public.admin_get_properties_overview();

-- Create admin properties overview function
CREATE OR REPLACE FUNCTION public.admin_get_properties_overview()
RETURNS TABLE(
  id uuid,
  address text,
  monthly_rent numeric,
  status text,
  owner_id uuid,
  owner_name text,
  owner_email text,
  on_market boolean,
  occupancy_status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  lease_start_date date,
  lease_end_date date,
  computed_status text,
  has_tenant boolean,
  tenant_count integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.address,
    p.monthly_rent,
    p.status,
    p.owner_id,
    CONCAT(prof.first_name, ' ', prof.last_name) as owner_name,
    au.email as owner_email,
    p.on_market,
    p.occupancy_status,
    p.created_at,
    p.updated_at,
    p.lease_start_date,
    p.lease_end_date,
    get_computed_property_status(p.id) as computed_status,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM property_applications pa 
        WHERE pa.property_id = p.id 
        AND pa.status = 'approved'
      ) THEN true 
      ELSE false 
    END as has_tenant,
    COALESCE((
      SELECT COUNT(*) 
      FROM property_applications pa 
      WHERE pa.property_id = p.id 
      AND pa.status = 'approved'
    ), 0)::integer as tenant_count
  FROM properties p
  LEFT JOIN profiles prof ON p.owner_id = prof.id
  LEFT JOIN auth.users au ON p.owner_id = au.id
  WHERE p.deleted_at IS NULL
  ORDER BY p.created_at DESC;
END;
$$;

-- Create admin set market status function
CREATE OR REPLACE FUNCTION public.admin_set_property_market_status(
  p_property_id uuid,
  p_on_market boolean,
  p_reason text DEFAULT 'Admin override via dashboard',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  property_record RECORD;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get property details
  SELECT * INTO property_record
  FROM properties 
  WHERE id = p_property_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Property not found'::TEXT;
    RETURN;
  END IF;
  
  -- Update property market status
  UPDATE properties 
  SET on_market = p_on_market,
      updated_at = NOW()
  WHERE id = p_property_id;
  
  RETURN QUERY SELECT TRUE, 'Market status updated successfully'::TEXT;
END;
$$;

-- Create admin remove tenant function
CREATE OR REPLACE FUNCTION public.admin_remove_property_tenant(
  p_property_id uuid,
  p_reason text DEFAULT 'Admin tenant removal via dashboard',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  property_record RECORD;
  tenant_record RECORD;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get property details
  SELECT * INTO property_record
  FROM properties 
  WHERE id = p_property_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Property not found'::TEXT;
    RETURN;
  END IF;
  
  -- Get current tenant
  SELECT pa.*, prof.first_name, prof.last_name, au.email
  INTO tenant_record
  FROM property_applications pa
  JOIN profiles prof ON pa.tenant_id = prof.id
  JOIN auth.users au ON pa.tenant_id = au.id
  WHERE pa.property_id = p_property_id 
    AND pa.status = 'approved'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'No active tenant found for this property'::TEXT;
    RETURN;
  END IF;
  
  -- Remove tenant by updating application status
  UPDATE property_applications 
  SET status = 'removed_by_admin',
      updated_at = NOW()
  WHERE property_id = p_property_id 
    AND status = 'approved';
  
  -- Update property status
  UPDATE properties 
  SET occupancy_status = 'vacant',
      on_market = true,
      updated_at = NOW()
  WHERE id = p_property_id;
  
  RETURN QUERY SELECT TRUE, 'Tenant removed successfully'::TEXT;
END;
$$;

-- Create admin switch tenant function
CREATE OR REPLACE FUNCTION public.admin_switch_property_tenant(
  p_property_id uuid,
  p_new_tenant_email text,
  p_reason text DEFAULT 'Admin tenant switch via dashboard',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(success boolean, message text, error text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  property_record RECORD;
  old_tenant_record RECORD;
  new_tenant_record RECORD;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get property details
  SELECT * INTO property_record
  FROM properties 
  WHERE id = p_property_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Property not found'::TEXT, 'PROPERTY_NOT_FOUND'::TEXT;
    RETURN;
  END IF;
  
  -- Get current tenant
  SELECT pa.*, prof.first_name, prof.last_name, au.email
  INTO old_tenant_record
  FROM property_applications pa
  JOIN profiles prof ON pa.tenant_id = prof.id
  JOIN auth.users au ON pa.tenant_id = au.id
  WHERE pa.property_id = p_property_id 
    AND pa.status = 'approved'
  LIMIT 1;
  
  -- Get new tenant by email
  SELECT prof.*, au.email
  INTO new_tenant_record
  FROM profiles prof
  JOIN auth.users au ON prof.id = au.id
  WHERE au.email = p_new_tenant_email;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'New tenant not found with email: ' || p_new_tenant_email, 'TENANT_NOT_FOUND'::TEXT;
    RETURN;
  END IF;
  
  -- Remove current tenant if exists
  IF old_tenant_record.id IS NOT NULL THEN
    UPDATE property_applications 
    SET status = 'removed_by_admin',
        updated_at = NOW()
    WHERE property_id = p_property_id 
      AND status = 'approved';
  END IF;
  
  -- Add new tenant
  INSERT INTO property_applications (
    property_id,
    tenant_id,
    status,
    application_data,
    created_at,
    updated_at
  ) VALUES (
    p_property_id,
    new_tenant_record.id,
    'approved',
    jsonb_build_object(
      'admin_assigned', true,
      'switch_reason', p_reason,
      'switched_by_admin', auth.uid()
    ),
    NOW(),
    NOW()
  );
  
  -- Update property status
  UPDATE properties 
  SET occupancy_status = 'occupied',
      on_market = false,
      updated_at = NOW()
  WHERE id = p_property_id;
  
  RETURN QUERY SELECT TRUE, 'Tenant switched successfully'::TEXT, NULL::TEXT;
END;
$$;