-- Create security definer function to bypass RLS cascade on messages
-- This function checks message access without triggering cascading RLS on properties table

CREATE OR REPLACE FUNCTION public.can_view_message(
  p_sender_id UUID,
  p_property_application_id UUID,
  p_marketplace_application_id UUID,
  p_property_push_id UUID,
  p_unit_application_id UUID
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User sent the message
    p_sender_id = auth.uid()
    -- OR user is a tenant on the property application
    OR EXISTS (SELECT 1 FROM property_applications WHERE id = p_property_application_id AND tenant_id = auth.uid())
    -- OR user is a tenant on the marketplace application
    OR EXISTS (SELECT 1 FROM marketplace_applications WHERE id = p_marketplace_application_id AND user_id = auth.uid())
    -- OR user is a tenant on the property push
    OR EXISTS (SELECT 1 FROM property_pushes WHERE id = p_property_push_id AND tenant_id = auth.uid())
    -- OR user is a tenant on the unit application
    OR EXISTS (SELECT 1 FROM unit_applications WHERE id = p_unit_application_id AND tenant_id = auth.uid())
    -- OR user is the property owner via property_applications (direct join, bypasses properties RLS)
    OR EXISTS (
      SELECT 1 FROM property_applications pa
      JOIN properties p ON p.id = pa.property_id
      WHERE pa.id = p_property_application_id AND p.owner_id = auth.uid()
    )
    -- OR user is the property owner via marketplace_applications
    OR EXISTS (
      SELECT 1 FROM marketplace_applications ma
      JOIN properties p ON p.id = ma.property_id
      WHERE ma.id = p_marketplace_application_id AND p.owner_id = auth.uid()
    )
    -- OR user is the property owner via property_pushes
    OR EXISTS (
      SELECT 1 FROM property_pushes pp
      JOIN properties p ON p.id = pp.property_id
      WHERE pp.id = p_property_push_id AND p.owner_id = auth.uid()
    )
    -- OR user is the property owner via unit_applications
    OR EXISTS (
      SELECT 1 FROM unit_applications ua
      JOIN property_units pu ON pu.id = ua.unit_id
      JOIN properties p ON p.id = pu.property_id
      WHERE ua.id = p_unit_application_id AND p.owner_id = auth.uid()
    )
$$;

-- Drop the existing complex RLS policy
DROP POLICY IF EXISTS "Users can view messages for their applications" ON public.messages;

-- Create optimized RLS policy using the security definer function
CREATE POLICY "Users can view messages for their applications"
ON public.messages
FOR SELECT
USING (
  public.can_view_message(
    sender_id,
    property_application_id,
    marketplace_application_id,
    property_push_id,
    unit_application_id
  )
  OR public.is_admin(auth.uid())
);