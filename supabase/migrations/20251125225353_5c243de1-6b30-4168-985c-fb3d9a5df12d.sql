-- Fix compute_tenant_context function to check for non-commercial property types
-- instead of the non-existent 'residential' enum value

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.compute_tenant_context(UUID);

-- Recreate with the corrected logic
CREATE FUNCTION public.compute_tenant_context(p_user_id UUID)
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
    COALESCE(MAX(CASE WHEN t.voucher_number IS NOT NULL THEN TRUE ELSE FALSE END), FALSE) AS is_voucher_holder,
    COALESCE(MAX(CASE WHEN p.property_type != 'commercial' THEN TRUE ELSE FALSE END), FALSE) AS is_residential_tenant,
    COALESCE(MAX(CASE WHEN p.property_type = 'commercial' AND p.commercial_type = 'marina' THEN TRUE ELSE FALSE END), FALSE) AS is_marine_tenant,
    COALESCE(up.looking_for_housing, FALSE) AS has_housing_interest
  FROM tenant_profiles t
  LEFT JOIN rent_payments rp ON rp.tenant_id = t.user_id
  LEFT JOIN properties p ON p.id = rp.property_id
  LEFT JOIN user_preferences up ON up.user_id = t.user_id
  WHERE t.user_id = p_user_id
  GROUP BY up.looking_for_housing;
END;
$$;