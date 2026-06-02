-- Add RLS policy to allow marketplace browsing for properties explicitly marked as on_market
-- This is separate from owner/tenant access and specifically for marketplace functionality

CREATE POLICY "Marketplace users can browse properties on market" 
ON public.properties 
FOR SELECT 
USING (
  status = 'available' 
  AND on_market = true 
  AND deleted_at IS NULL
);