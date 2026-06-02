
-- Phase 1: Core marketplace access functions

-- 1) Compute a tenant's context once, used by frontend and other functions
CREATE OR REPLACE FUNCTION public.compute_tenant_context(p_user_id uuid)
RETURNS TABLE(
  is_voucher_holder boolean,
  has_residential_tenancy boolean,
  has_marine_tenancy boolean,
  housing_interest boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    -- Voucher holder if any approved application marks tenant_type as 'voucher'
    EXISTS (
      SELECT 1
      FROM public.property_applications pa
      WHERE pa.tenant_id = p_user_id
        AND pa.status = 'approved'
        AND COALESCE(pa.application_data->>'tenant_type', '') = 'voucher'
    ) AS is_voucher_holder,

    -- Residential tenancy if any approved application is on a residential property
    EXISTS (
      SELECT 1
      FROM public.property_applications pa
      JOIN public.properties p ON p.id = pa.property_id
      WHERE pa.tenant_id = p_user_id
        AND pa.status = 'approved'
        AND p.property_type = 'residential'
    ) AS has_residential_tenancy,

    -- Commercial/marine tenancy if any approved application is on a commercial property
    -- (generalized for all commercial assets; includes marinas/boat slips where modeled as commercial)
    EXISTS (
      SELECT 1
      FROM public.property_applications pa
      JOIN public.properties p ON p.id = pa.property_id
      WHERE pa.tenant_id = p_user_id
        AND pa.status = 'approved'
        AND p.property_type = 'commercial'
    ) AS has_marine_tenancy,

    -- Tenant-declared interest in housing search (toggle managed in UI)
    COALESCE((
      SELECT tp.housing_interest
      FROM public.tenant_profiles tp
      WHERE tp.user_id = p_user_id
      LIMIT 1
    ), false) AS housing_interest;
END;
$function$;

-- 2) Single source of truth for marketplace access
-- Modes:
--   - 'section8': show only to voucher or residential tenants (boat/commercial-only are hidden)
--   - 'mixed': show to residential tenants OR anyone who expressed housing interest
CREATE OR REPLACE FUNCTION public.should_show_marketplace(p_user_id uuid, p_marketplace_mode text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_is_voucher            boolean := false;
  v_has_residential       boolean := false;
  v_has_marine            boolean := false;
  v_housing_interest      boolean := false;
  v_mode                  text    := COALESCE(lower(p_marketplace_mode), 'section8');
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT is_voucher_holder, has_residential_tenancy, has_marine_tenancy, housing_interest
    INTO v_is_voucher, v_has_residential, v_has_marine, v_housing_interest
  FROM public.compute_tenant_context(p_user_id)
  LIMIT 1;

  IF v_mode = 'section8' THEN
    -- Boat/commercial-only tenants do NOT see marketplace in Section 8 phase
    RETURN (v_is_voucher OR v_has_residential);
  ELSIF v_mode = 'mixed' THEN
    -- Boat/commercial tenants can see marketplace when they explicitly express housing interest
    RETURN (v_has_residential OR v_housing_interest);
  ELSE
    -- Default to Section 8 behavior for unknown modes
    RETURN (v_is_voucher OR v_has_residential);
  END IF;
END;
$function$;
