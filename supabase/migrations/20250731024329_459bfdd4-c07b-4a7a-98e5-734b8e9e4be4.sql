-- Enhance property_units table to support full unit management
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS security_deposit NUMERIC DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS lease_start_date DATE;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS lease_end_date DATE;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id);
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add trigger to update updated_at
CREATE OR REPLACE TRIGGER update_property_units_updated_at
    BEFORE UPDATE ON public.property_units
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update maintenance_requests to support unit-level tracking
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.property_units(id);

-- Update property_applications to support unit-level applications
ALTER TABLE public.property_applications ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.property_units(id);

-- Create constraint to ensure either property_id OR unit_id is set for applications
ALTER TABLE public.property_applications DROP CONSTRAINT IF EXISTS chk_property_or_unit_app;
ALTER TABLE public.property_applications ADD CONSTRAINT chk_property_or_unit_app 
CHECK (
  (property_id IS NOT NULL AND unit_id IS NULL) OR 
  (property_id IS NULL AND unit_id IS NOT NULL)
);

-- Update rent_payments to support unit-level payments
-- unit_id column already exists, just add constraint
ALTER TABLE public.rent_payments DROP CONSTRAINT IF EXISTS chk_property_or_unit_payment;
ALTER TABLE public.rent_payments ADD CONSTRAINT chk_property_or_unit_payment 
CHECK (
  (property_id IS NOT NULL) OR 
  (unit_id IS NOT NULL)
);

-- Create property_unit_documents table for unit-specific documents
CREATE TABLE IF NOT EXISTS public.property_unit_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.property_units(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  document_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on property_unit_documents
ALTER TABLE public.property_unit_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for property_unit_documents
CREATE POLICY "Property owners can manage unit documents" 
ON public.property_unit_documents 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM property_units pu
    JOIN properties p ON pu.property_id = p.id
    WHERE pu.id = property_unit_documents.unit_id 
    AND p.owner_id = auth.uid()
  )
);

-- Add trigger for property_unit_documents updated_at
CREATE OR REPLACE TRIGGER update_property_unit_documents_updated_at
    BEFORE UPDATE ON public.property_unit_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();