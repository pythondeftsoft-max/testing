-- Drop and recreate compute_tenant_context function to fix MAX(boolean) error
DROP FUNCTION IF EXISTS public.compute_tenant_context(UUID);

CREATE OR REPLACE FUNCTION public.compute_tenant_context(p_user_id UUID)
RETURNS TABLE (
  is_voucher_holder BOOLEAN,
  is_residential_tenant BOOLEAN,
  is_marine_tenant BOOLEAN,
  has_housing_interest BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(BOOL_OR(tp.voucher_holder), FALSE) AS is_voucher_holder,
    COALESCE(BOOL_OR(p.property_type != 'commercial'), FALSE) AS is_residential_tenant,
    COALESCE(BOOL_OR(p.property_type = 'commercial' AND p.commercial_type = 'marina'), FALSE) AS is_marine_tenant,
    COALESCE(MAX(CASE WHEN up.looking_for_housing THEN 1 ELSE 0 END) = 1, FALSE) AS has_housing_interest
  FROM tenant_profiles tp
  LEFT JOIN tenant_properties tpr ON tpr.tenant_id = tp.user_id
  LEFT JOIN properties p ON p.id = tpr.property_id
  LEFT JOIN user_preferences up ON up.user_id = tp.user_id
  WHERE tp.user_id = p_user_id
  GROUP BY up.looking_for_housing;
END;
$$;