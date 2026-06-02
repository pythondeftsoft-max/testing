-- Drop the problematic policy causing infinite recursion
DROP POLICY IF EXISTS "Tenants can view properties they applied to" ON properties;

-- Create a SECURITY DEFINER function to check if user has applied to a property
-- This bypasses RLS and breaks the circular dependency
CREATE OR REPLACE FUNCTION public.user_has_marketplace_application_for_property(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM marketplace_applications ma
    WHERE ma.property_id = p_property_id
    AND ma.user_id = auth.uid()
  )
$$;

-- Recreate the policy using the SECURITY DEFINER function
-- This allows tenants to view properties they applied to without infinite recursion
CREATE POLICY "Tenants can view properties they applied to"
ON properties FOR SELECT
USING (
  public.user_has_marketplace_application_for_property(id) 
  AND deleted_at IS NULL
);