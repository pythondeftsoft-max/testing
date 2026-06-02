-- Create security definer function to check property ownership (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_property_owner(p_property_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM properties 
    WHERE id = p_property_id 
    AND owner_id = p_user_id 
    AND deleted_at IS NULL
  );
$$;

-- Add new INSERT policy using the security definer function
CREATE POLICY "Property owners can create appointments via function"
ON public.maintenance_appointments
FOR INSERT
WITH CHECK (
  is_property_owner(property_id, auth.uid())
);