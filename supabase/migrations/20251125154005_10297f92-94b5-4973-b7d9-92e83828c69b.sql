-- Drop the problematic RLS policy that causes infinite recursion
DROP POLICY IF EXISTS "Tenants can view their housed properties" ON properties;

-- Create SECURITY DEFINER function to check if tenant is housed in property
-- This bypasses RLS and breaks the circular dependency
CREATE OR REPLACE FUNCTION is_tenant_housed_in_property(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_properties 
    WHERE property_id = p_property_id 
    AND tenant_id = auth.uid() 
    AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM lease_lifecycle_tracking 
    WHERE property_id = p_property_id 
    AND tenant_id = auth.uid() 
    AND lease_status = 'active'
  );
$$;

-- Recreate the RLS policy using the security definer function
CREATE POLICY "Tenants can view their housed properties"
  ON properties FOR SELECT
  USING (is_tenant_housed_in_property(id));