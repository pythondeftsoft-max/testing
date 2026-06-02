-- Update tenant UPDATE policy to support property_push_id
DROP POLICY IF EXISTS "Tenants can update read status for their application messages" ON public.messages;

CREATE POLICY "Tenants can update read status for their application messages"
ON public.messages
FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM property_applications pa 
    WHERE pa.id = messages.property_application_id 
    AND pa.tenant_id = auth.uid()
  ))
  OR 
  (EXISTS (
    SELECT 1 FROM marketplace_applications ma 
    WHERE ma.id = messages.marketplace_application_id 
    AND ma.user_id = auth.uid()
  ))
  OR 
  (EXISTS (
    SELECT 1 FROM property_pushes pp 
    WHERE pp.id = messages.property_push_id 
    AND pp.tenant_id = auth.uid()
  ))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM property_applications pa 
    WHERE pa.id = messages.property_application_id 
    AND pa.tenant_id = auth.uid()
  ))
  OR 
  (EXISTS (
    SELECT 1 FROM marketplace_applications ma 
    WHERE ma.id = messages.marketplace_application_id 
    AND ma.user_id = auth.uid()
  ))
  OR 
  (EXISTS (
    SELECT 1 FROM property_pushes pp 
    WHERE pp.id = messages.property_push_id 
    AND pp.tenant_id = auth.uid()
  ))
);

-- Update landlord UPDATE policy to support property_push_id
DROP POLICY IF EXISTS "Property owners can update read status for their property messa" ON public.messages;

CREATE POLICY "Property owners can update read status for their property messages"
ON public.messages
FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM property_applications pa
    JOIN properties p ON pa.property_id = p.id
    WHERE pa.id = messages.property_application_id 
    AND p.owner_id = auth.uid()
  ))
  OR 
  (EXISTS (
    SELECT 1 FROM marketplace_applications ma
    JOIN properties p ON ma.property_id = p.id
    WHERE ma.id = messages.marketplace_application_id 
    AND p.owner_id = auth.uid()
  ))
  OR 
  (EXISTS (
    SELECT 1 FROM property_pushes pp
    JOIN properties p ON pp.property_id = p.id
    WHERE pp.id = messages.property_push_id 
    AND p.owner_id = auth.uid()
  ))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM property_applications pa
    JOIN properties p ON pa.property_id = p.id
    WHERE pa.id = messages.property_application_id 
    AND p.owner_id = auth.uid()
  ))
  OR 
  (EXISTS (
    SELECT 1 FROM marketplace_applications ma
    JOIN properties p ON ma.property_id = p.id
    WHERE ma.id = messages.marketplace_application_id 
    AND p.owner_id = auth.uid()
  ))
  OR 
  (EXISTS (
    SELECT 1 FROM property_pushes pp
    JOIN properties p ON pp.property_id = p.id
    WHERE pp.id = messages.property_push_id 
    AND p.owner_id = auth.uid()
  ))
);