-- Drop existing RLS policies on messages table
DROP POLICY IF EXISTS "Users can view messages for their applications" ON messages;
DROP POLICY IF EXISTS "Users can send messages for their applications" ON messages;
DROP POLICY IF EXISTS "Tenants can update read status for their application messages" ON messages;
DROP POLICY IF EXISTS "Property owners can update read status for their property messages" ON messages;

-- Recreate SELECT policy with marketplace_application_id support
CREATE POLICY "Users can view messages for their applications" ON messages
FOR SELECT TO public
USING (
  sender_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM property_applications pa
    WHERE pa.id = messages.property_application_id
    AND (pa.tenant_id = auth.uid() OR EXISTS (
      SELECT 1 FROM properties p 
      WHERE p.id = pa.property_id AND p.owner_id = auth.uid()
    ))
  )
  OR EXISTS (
    SELECT 1 FROM marketplace_applications ma
    WHERE ma.id = messages.marketplace_application_id
    AND (ma.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM properties p 
      WHERE p.id = ma.property_id AND p.owner_id = auth.uid()
    ))
  )
);

-- Recreate INSERT policy with marketplace_application_id support
CREATE POLICY "Users can send messages for their applications" ON messages
FOR INSERT TO public
WITH CHECK (
  sender_id = auth.uid() 
  AND (
    EXISTS (
      SELECT 1 FROM property_applications pa
      WHERE pa.id = messages.property_application_id
      AND (pa.tenant_id = auth.uid() OR EXISTS (
        SELECT 1 FROM properties p 
        WHERE p.id = pa.property_id AND p.owner_id = auth.uid()
      ))
    )
    OR
    EXISTS (
      SELECT 1 FROM marketplace_applications ma
      WHERE ma.id = messages.marketplace_application_id
      AND (ma.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM properties p 
        WHERE p.id = ma.property_id AND p.owner_id = auth.uid()
      ))
    )
  )
);

-- Recreate UPDATE policy for tenants with marketplace_application_id support
CREATE POLICY "Tenants can update read status for their application messages" ON messages
FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM property_applications pa
    WHERE pa.id = messages.property_application_id
    AND pa.tenant_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM marketplace_applications ma
    WHERE ma.id = messages.marketplace_application_id
    AND ma.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM property_applications pa
    WHERE pa.id = messages.property_application_id
    AND pa.tenant_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM marketplace_applications ma
    WHERE ma.id = messages.marketplace_application_id
    AND ma.user_id = auth.uid()
  )
);

-- Recreate UPDATE policy for property owners with marketplace_application_id support
CREATE POLICY "Property owners can update read status for their property messages" ON messages
FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM property_applications pa
    JOIN properties p ON pa.property_id = p.id
    WHERE pa.id = messages.property_application_id
    AND p.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM marketplace_applications ma
    JOIN properties p ON ma.property_id = p.id
    WHERE ma.id = messages.marketplace_application_id
    AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM property_applications pa
    JOIN properties p ON pa.property_id = p.id
    WHERE pa.id = messages.property_application_id
    AND p.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM marketplace_applications ma
    JOIN properties p ON ma.property_id = p.id
    WHERE ma.id = messages.marketplace_application_id
    AND p.owner_id = auth.uid()
  )
);