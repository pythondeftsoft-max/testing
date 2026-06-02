-- Remove the existing constraint that requires property_id
ALTER TABLE public.property_tenant_requests 
DROP CONSTRAINT IF EXISTS chk_property_or_unit_id;

-- Add a new constraint that allows either property_id OR unit_id
ALTER TABLE public.property_tenant_requests 
ADD CONSTRAINT chk_property_or_unit_id 
CHECK (
  (property_id IS NOT NULL AND unit_id IS NULL) OR 
  (property_id IS NULL AND unit_id IS NOT NULL)
);