-- Create SECURITY DEFINER function to check property ownership (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_owns_property(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM properties 
    WHERE id = p_property_id 
    AND owner_id = auth.uid()
    AND deleted_at IS NULL
  );
$$;

-- Add new RLS policy for property_units that uses the SECURITY DEFINER function
CREATE POLICY "Property owners can view units via function" 
ON property_units FOR SELECT
USING (public.user_owns_property(property_id));