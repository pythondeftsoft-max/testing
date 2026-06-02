-- Add RLS policy to allow tenants to create rent payments for their approved properties
CREATE POLICY "Tenants can create rent payments for their approved properties" 
  ON public.rent_payments 
  FOR INSERT 
  WITH CHECK (
    tenant_id = auth.uid() 
    AND EXISTS (
      SELECT 1 
      FROM property_applications pa 
      WHERE pa.property_id = rent_payments.property_id 
        AND pa.tenant_id = auth.uid() 
        AND pa.status = 'approved'
    )
  );