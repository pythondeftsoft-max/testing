-- First, drop the problematic policy
DROP POLICY IF EXISTS "Tenants can view properties they have applications for" ON public.properties;

-- Create a security definer function to check if user has approved application for property
CREATE OR REPLACE FUNCTION public.user_has_approved_application_for_property(property_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM property_applications pa 
    WHERE pa.property_id = $1
    AND pa.tenant_id = auth.uid()
    AND pa.status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create new policy using the security definer function
CREATE POLICY "Tenants can view properties they have applications for"
ON public.properties
FOR SELECT
TO authenticated
USING (public.user_has_approved_application_for_property(id));