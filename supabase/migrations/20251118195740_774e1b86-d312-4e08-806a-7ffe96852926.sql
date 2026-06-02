-- Create RPC function for fetching deleted properties with audit trail
CREATE OR REPLACE FUNCTION admin_get_deleted_properties()
RETURNS TABLE(
  id uuid,
  address text,
  monthly_rent numeric,
  status text,
  owner_id uuid,
  owner_name text,
  owner_email text,
  occupancy_status text,
  unit_count integer,
  tenant_count integer,
  portfolio_id uuid,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  deleted_by_name text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Check admin access
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
    CONCAT(owner_prof.first_name, ' ', owner_prof.last_name) as owner_name,
    owner_user.email::text as owner_email,
    p.occupancy_status,
    COALESCE(p.unit_count, 1)::integer as unit_count,
    COALESCE((
      SELECT COUNT(*)
      FROM property_applications pa
      WHERE pa.property_id = p.id
      AND pa.status = 'approved'
    ), 0)::integer as tenant_count,
    p.portfolio_id,
    p.deleted_at,
    p.deleted_by,
    CONCAT(deleter_prof.first_name, ' ', deleter_prof.last_name) as deleted_by_name,
    p.created_at
  FROM properties p
  LEFT JOIN profiles owner_prof ON p.owner_id = owner_prof.id
  LEFT JOIN auth.users owner_user ON p.owner_id = owner_user.id
  LEFT JOIN profiles deleter_prof ON p.deleted_by = deleter_prof.id
  WHERE p.deleted_at IS NOT NULL
  ORDER BY p.deleted_at DESC;
END;
$$;