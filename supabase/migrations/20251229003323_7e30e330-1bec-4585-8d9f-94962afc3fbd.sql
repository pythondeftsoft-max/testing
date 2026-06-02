-- Drop existing messages SELECT policy and recreate with property_push_id support
DROP POLICY IF EXISTS "Users can view messages for their applications" ON messages;

-- Create updated SELECT policy that includes property_push_id access
CREATE POLICY "Users can view messages for their applications" ON messages
FOR SELECT USING (
  -- User is the sender
  sender_id = auth.uid()
  -- OR user owns the property_application
  OR EXISTS (
    SELECT 1 FROM property_applications pa
    WHERE pa.id = messages.property_application_id
    AND pa.tenant_id = auth.uid()
  )
  -- OR user owns the marketplace_application
  OR EXISTS (
    SELECT 1 FROM marketplace_applications ma
    WHERE ma.id = messages.marketplace_application_id
    AND ma.user_id = auth.uid()
  )
  -- OR user is the tenant on the property_push
  OR EXISTS (
    SELECT 1 FROM property_pushes pp
    WHERE pp.id = messages.property_push_id
    AND pp.tenant_id = auth.uid()
  )
  -- OR user is the landlord (property owner) for property_application
  OR EXISTS (
    SELECT 1 FROM property_applications pa
    JOIN properties p ON p.id = pa.property_id
    WHERE pa.id = messages.property_application_id
    AND p.owner_id = auth.uid()
  )
  -- OR user is the landlord (property owner) for marketplace_application
  OR EXISTS (
    SELECT 1 FROM marketplace_applications ma
    JOIN properties p ON p.id = ma.property_id
    WHERE ma.id = messages.marketplace_application_id
    AND p.owner_id = auth.uid()
  )
  -- OR user is the landlord (property owner) for property_push
  OR EXISTS (
    SELECT 1 FROM property_pushes pp
    JOIN properties p ON p.id = pp.property_id
    WHERE pp.id = messages.property_push_id
    AND p.owner_id = auth.uid()
  )
);