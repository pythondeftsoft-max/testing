-- Step 1: Drop the problematic RLS policy causing infinite recursion
DROP POLICY IF EXISTS "Tenants can view properties with their lease renewals" ON properties;

-- Step 2: Create a security definer function to check tenant lease renewals
-- This breaks the circular dependency by bypassing RLS on lease_renewals
CREATE OR REPLACE FUNCTION public.tenant_has_lease_renewal_for_property(property_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lease_renewals
    WHERE lease_renewals.property_id = $1 
    AND lease_renewals.tenant_id = auth.uid()
  );
$$;

-- Step 3: Create a safe RLS policy using the security definer function
CREATE POLICY "Tenants can view properties with their lease renewals"
ON properties FOR SELECT
USING (public.tenant_has_lease_renewal_for_property(id));