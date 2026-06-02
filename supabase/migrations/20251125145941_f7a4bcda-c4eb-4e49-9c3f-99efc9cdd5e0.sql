-- Add RLS policy to allow tenants to view properties they applied to
-- This ensures tenants can see their applications even if the property is taken off market
CREATE POLICY "Tenants can view properties they applied to"
ON properties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM marketplace_applications ma
    WHERE ma.property_id = properties.id
    AND ma.user_id = auth.uid()
  )
  AND deleted_at IS NULL
);