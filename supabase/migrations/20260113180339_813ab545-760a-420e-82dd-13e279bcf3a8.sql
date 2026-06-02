-- Fix the admin_get_properties_overview function - use correct table name (tenant_properties instead of non-existent tenancies)
DROP FUNCTION IF EXISTS public.admin_get_properties_overview();

CREATE OR REPLACE FUNCTION public.admin_get_properties_overview()
RETURNS TABLE (
  id uuid,
  address text,
  monthly_rent numeric,
  status text,
  owner_id uuid,
  portfolio_id uuid,
  owner_name text,
  tenant_count bigint,
  maintenance_count bigint,
  created_at timestamptz,
  deleted_at timestamptz,
  lease_end_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.address,
    p.monthly_rent,
    p.status,
    p.owner_id,
    p.portfolio_id,
    CONCAT(prof.first_name, ' ', prof.last_name)::text as owner_name,
    COUNT(DISTINCT tp.id) as tenant_count,
    COUNT(DISTINCT m.id) as maintenance_count,
    p.created_at,
    p.deleted_at,
    p.lease_end_date
  FROM properties p
  LEFT JOIN profiles prof ON p.owner_id = prof.id
  LEFT JOIN tenant_properties tp ON p.id = tp.property_id AND tp.is_active = true
  LEFT JOIN maintenance_requests m ON p.id = m.property_id AND m.status IN ('pending', 'in_progress')
  GROUP BY p.id, p.address, p.monthly_rent, p.status, p.owner_id, p.portfolio_id, prof.first_name, prof.last_name, p.created_at, p.deleted_at, p.lease_end_date
  ORDER BY p.created_at DESC;
END;
$$;