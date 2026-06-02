-- First, let's check what RLS policies exist on the messages table
-- Then add a policy to allow tenants to update read status on messages in their applications

-- Allow tenants to update read status for messages in their property applications
CREATE POLICY "Tenants can update read status for their application messages" 
ON public.messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM property_applications pa 
    WHERE pa.id = messages.property_application_id 
    AND pa.tenant_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM property_applications pa 
    WHERE pa.id = messages.property_application_id 
    AND pa.tenant_id = auth.uid()
  )
);