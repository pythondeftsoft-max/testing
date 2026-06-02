-- Fix type mismatch in admin_get_properties_overview function
DROP FUNCTION IF EXISTS public.admin_get_properties_overview();

CREATE FUNCTION public.admin_get_properties_overview()
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
    au.email::text as owner_email, -- Cast to text to fix type mismatch
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