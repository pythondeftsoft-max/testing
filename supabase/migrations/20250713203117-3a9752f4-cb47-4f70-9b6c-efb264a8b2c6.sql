-- Add RLS policy to allow tenants to view rent splits for their approved properties
CREATE POLICY "Tenants can view rent splits for their approved properties" 
  ON public.rent_splits 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM property_applications 
    WHERE property_id = rent_splits.property_id 
    AND tenant_id = auth.uid() 
    AND status = 'approved'
  ));