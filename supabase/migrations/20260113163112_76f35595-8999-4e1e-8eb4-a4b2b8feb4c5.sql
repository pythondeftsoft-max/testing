-- Add missing tenant_marketplace_mode column if not exists
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS tenant_marketplace_mode TEXT DEFAULT 'section8';

-- Add unique constraint for upserts if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_user_id_key'
  ) THEN
    ALTER TABLE public.user_preferences 
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Drop and recreate compute_tenant_context with correct return type
DROP FUNCTION IF EXISTS public.compute_tenant_context(UUID);

CREATE OR REPLACE FUNCTION public.compute_tenant_context(p_user_id UUID)
RETURNS TABLE (
  is_voucher_holder BOOLEAN,
  has_residential_tenancy BOOLEAN,
  has_marine_tenancy BOOLEAN,
  housing_interest BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT BOOL_OR(tp.voucher_holder) FROM tenant_profiles tp WHERE tp.user_id = p_user_id), FALSE) AS is_voucher_holder,
    COALESCE((
      SELECT BOOL_OR(CASE WHEN p.property_type IS NOT NULL AND p.property_type != 'commercial' THEN TRUE ELSE FALSE END)
      FROM rent_payments rp
      JOIN properties p ON p.id = rp.property_id
      WHERE rp.tenant_id = p_user_id
    ), FALSE) AS has_residential_tenancy,
    FALSE AS has_marine_tenancy,
    COALESCE((SELECT BOOL_OR(tp.housing_interest) FROM tenant_profiles tp WHERE tp.user_id = p_user_id), FALSE) AS housing_interest;
END;
$$;