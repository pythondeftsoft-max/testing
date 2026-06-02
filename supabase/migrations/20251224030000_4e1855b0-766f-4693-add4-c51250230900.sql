-- Add RLS policy so tenants can view pushes sent to them
CREATE POLICY "Tenants can view pushes sent to them" 
ON property_pushes
FOR SELECT
USING (tenant_id = auth.uid());