-- Add RLS policy to allow tenants to view properties they have approved applications for
CREATE POLICY "Tenants can view properties they have applications for"
ON public.properties
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM property_applications pa 
    WHERE pa.property_id = properties.id 
    AND pa.tenant_id = auth.uid()
    AND pa.status = 'approved'
  )
);