-- Add RLS policy to allow property owners to update message read status
CREATE POLICY "Property owners can update read status for their property messages"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM property_applications pa
    JOIN properties p ON pa.property_id = p.id
    WHERE pa.id = messages.property_application_id 
    AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM property_applications pa
    JOIN properties p ON pa.property_id = p.id
    WHERE pa.id = messages.property_application_id 
    AND p.owner_id = auth.uid()
  )
);