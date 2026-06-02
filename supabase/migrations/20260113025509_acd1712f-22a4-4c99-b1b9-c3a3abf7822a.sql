-- Drop existing function first, then recreate with correct columns
DROP FUNCTION IF EXISTS public.compute_tenant_context(uuid);

CREATE OR REPLACE FUNCTION public.compute_tenant_context(p_user_id uuid)
RETURNS TABLE(is_voucher_holder boolean, has_residential_tenancy boolean, has_marine_tenancy boolean, housing_interest boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(t.voucher_holder, FALSE) AS is_voucher_holder,
    COALESCE(MAX(CASE WHEN p.property_type IS NULL OR p.property_type != 'commercial' THEN TRUE ELSE FALSE END), FALSE) AS has_residential_tenancy,
    COALESCE(MAX(CASE WHEN p.property_type = 'commercial' AND p.commercial_type = 'marina' THEN TRUE ELSE FALSE END), FALSE) AS has_marine_tenancy,
    COALESCE(t.housing_interest, FALSE) AS housing_interest
  FROM tenant_profiles t
  LEFT JOIN rent_payments rp ON rp.tenant_id = t.user_id
  LEFT JOIN properties p ON p.id = rp.property_id
  WHERE t.user_id = p_user_id
  GROUP BY t.voucher_holder, t.housing_interest;
END;
$function$;