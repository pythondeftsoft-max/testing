DROP FUNCTION IF EXISTS public.admin_get_properties_overview();

CREATE OR REPLACE FUNCTION public.admin_get_properties_overview()
RETURNS TABLE (
  id uuid,
  address text,
  city text,
  state text,
  zipcode text,
  monthly_rent numeric,
  status text,
  property_type text,
  bedrooms integer,
  bathrooms numeric,
  unit_count integer,
  created_at timestamptz,
  owner_id uuid,
  portfolio_id uuid,
  on_market boolean,
  lease_end_date date,
  tenant_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.address,
    p.city,
    p.state,
    p.zipcode,
    p.monthly_rent,
    p.status,
    p.property_type,
    p.bedrooms,
    p.bathrooms,
    p.unit_count,
    p.created_at,
    p.owner_id,
    p.portfolio_id,
    p.on_market,
    NULL::date AS lease_end_date,
    0::bigint AS tenant_count
  FROM properties p
  WHERE p.deleted_at IS NULL
    AND (p.acquisition_source IS NULL OR p.acquisition_source != 'scout_agent')
  ORDER BY p.created_at DESC;
$$;