-- Add unit_id column to property_tenant_requests table to support unit-level tenant requests
ALTER TABLE public.property_tenant_requests 
ADD COLUMN unit_id UUID REFERENCES public.property_units(id);

-- Create index for better performance on unit_id lookups
CREATE INDEX idx_property_tenant_requests_unit_id ON public.property_tenant_requests(unit_id);

-- Update the constraint to allow either property_id OR unit_id (but not both)
ALTER TABLE public.property_tenant_requests 
ADD CONSTRAINT chk_property_or_unit_id 
CHECK (
  (property_id IS NOT NULL AND unit_id IS NULL) OR 
  (property_id IS NULL AND unit_id IS NOT NULL)
);