-- Drop existing functions
DROP FUNCTION IF EXISTS get_landlord_appointments(uuid);
DROP FUNCTION IF EXISTS get_admin_all_appointments(uuid);

-- Recreate get_landlord_appointments with correct column references (no full_name)
CREATE FUNCTION get_landlord_appointments(p_portfolio_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  scheduled_date timestamptz,
  estimated_duration integer,
  notes text,
  status text,
  tenant_confirmed boolean,
  vendor_confirmed boolean,
  property_id uuid,
  unit_id uuid,
  vendor_id uuid,
  maintenance_request_id uuid,
  tenant_id uuid,
  created_at timestamptz,
  property_address text,
  unit_name text,
  vendor_name text,
  request_title text,
  tenant_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ma.id,
    ma.scheduled_date,
    ma.estimated_duration,
    ma.notes,
    ma.status::text,
    ma.tenant_confirmed,
    ma.vendor_confirmed,
    ma.property_id,
    ma.unit_id,
    ma.vendor_id,
    ma.maintenance_request_id,
    ma.tenant_id,
    ma.created_at,
    p.address AS property_address,
    COALESCE(pu.unit_name, pu.unit_number) AS unit_name,
    mv.company_name AS vendor_name,
    mr.title AS request_title,
    COALESCE(prof.first_name || ' ' || prof.last_name, 'Unknown') AS tenant_name
  FROM maintenance_appointments ma
  LEFT JOIN properties p ON ma.property_id = p.id
  LEFT JOIN property_units pu ON ma.unit_id = pu.id
  LEFT JOIN maintenance_vendors mv ON ma.vendor_id = mv.id
  LEFT JOIN maintenance_requests mr ON ma.maintenance_request_id = mr.id
  LEFT JOIN profiles prof ON ma.tenant_id = prof.id
  WHERE p.owner_id = auth.uid()
    AND (p_portfolio_id IS NULL OR p.portfolio_id = p_portfolio_id)
  ORDER BY ma.scheduled_date DESC;
END;
$$;

-- Recreate get_admin_all_appointments with correct column references (no full_name)
CREATE FUNCTION get_admin_all_appointments(p_portfolio_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  scheduled_date timestamptz,
  estimated_duration integer,
  notes text,
  status text,
  tenant_confirmed boolean,
  vendor_confirmed boolean,
  property_id uuid,
  unit_id uuid,
  vendor_id uuid,
  maintenance_request_id uuid,
  tenant_id uuid,
  created_at timestamptz,
  property_address text,
  unit_name text,
  vendor_name text,
  request_title text,
  tenant_name text,
  landlord_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    ma.id,
    ma.scheduled_date,
    ma.estimated_duration,
    ma.notes,
    ma.status::text,
    ma.tenant_confirmed,
    ma.vendor_confirmed,
    ma.property_id,
    ma.unit_id,
    ma.vendor_id,
    ma.maintenance_request_id,
    ma.tenant_id,
    ma.created_at,
    p.address AS property_address,
    COALESCE(pu.unit_name, pu.unit_number) AS unit_name,
    mv.company_name AS vendor_name,
    mr.title AS request_title,
    COALESCE(prof.first_name || ' ' || prof.last_name, 'Unknown') AS tenant_name,
    COALESCE(landlord.first_name || ' ' || landlord.last_name, 'Unknown') AS landlord_name
  FROM maintenance_appointments ma
  LEFT JOIN properties p ON ma.property_id = p.id
  LEFT JOIN property_units pu ON ma.unit_id = pu.id
  LEFT JOIN maintenance_vendors mv ON ma.vendor_id = mv.id
  LEFT JOIN maintenance_requests mr ON ma.maintenance_request_id = mr.id
  LEFT JOIN profiles prof ON ma.tenant_id = prof.id
  LEFT JOIN profiles landlord ON p.owner_id = landlord.id
  WHERE (p_portfolio_id IS NULL OR p.portfolio_id = p_portfolio_id)
  ORDER BY ma.scheduled_date DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_landlord_appointments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_all_appointments(uuid) TO authenticated;