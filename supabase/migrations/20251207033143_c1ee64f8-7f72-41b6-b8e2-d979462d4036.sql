-- First drop all policies that depend on the function
DROP POLICY IF EXISTS "Property owners can view units via function" ON property_units;
DROP POLICY IF EXISTS "Authenticated users can view available units for marketplace" ON property_units;
DROP POLICY IF EXISTS "Property units visible with properties" ON property_units;
DROP POLICY IF EXISTS "Users can view property units" ON property_units;
DROP POLICY IF EXISTS "Property owners can manage their units" ON property_units;
DROP POLICY IF EXISTS "Property owners can insert units" ON property_units;
DROP POLICY IF EXISTS "Property owners can update units" ON property_units;
DROP POLICY IF EXISTS "Property owners can delete units" ON property_units;

-- Now drop the function with CASCADE
DROP FUNCTION IF EXISTS public.user_owns_property(uuid) CASCADE;

-- Recreate with correct signature
CREATE OR REPLACE FUNCTION public.user_owns_property(property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM properties 
    WHERE id = property_id 
    AND owner_id = auth.uid()
  )
$$;

-- Create comprehensive SELECT policy for property_units
CREATE POLICY "Users can view property units" 
ON property_units FOR SELECT
USING (
  -- Admins can see all units
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  OR
  -- Property owners can see their units (via security definer function to avoid RLS recursion)
  public.user_owns_property(property_id)
  OR
  -- Portfolio members can see portfolio units
  EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = property_units.property_id 
    AND p.portfolio_id IS NOT NULL 
    AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner', 'editor', 'viewer']::portfolio_role_type[])
  )
  OR
  -- Tenants can see their assigned units
  tenant_id = auth.uid()
  OR
  -- On-market units for marketplace browsing
  on_market = TRUE
);

-- Create INSERT policy for property owners
CREATE POLICY "Property owners can insert units"
ON property_units FOR INSERT
WITH CHECK (
  public.user_owns_property(property_id)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
);

-- Create UPDATE policy for property owners
CREATE POLICY "Property owners can update units"
ON property_units FOR UPDATE
USING (
  public.user_owns_property(property_id)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
);

-- Create DELETE policy for property owners
CREATE POLICY "Property owners can delete units"
ON property_units FOR DELETE
USING (
  public.user_owns_property(property_id)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
);