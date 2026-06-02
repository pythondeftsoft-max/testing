-- Create unit-documents storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'unit-documents',
  'unit-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- Create property_unit_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.property_unit_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL,
  property_id UUID NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on property_unit_documents
ALTER TABLE public.property_unit_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for property_unit_documents
CREATE POLICY "Property owners can manage unit documents"
ON public.property_unit_documents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.property_units pu
    JOIN public.properties p ON pu.property_id = p.id
    WHERE pu.id = property_unit_documents.unit_id
    AND (p.owner_id = auth.uid() OR (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
  )
);

CREATE POLICY "Approved tenants can view unit documents"
ON public.property_unit_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.property_units pu
    JOIN public.properties p ON pu.property_id = p.id
    LEFT JOIN public.property_applications pa ON p.id = pa.property_id
    WHERE pu.id = property_unit_documents.unit_id
    AND pa.tenant_id = auth.uid()
    AND pa.status = 'approved'
  )
);

CREATE POLICY "Admins can manage all unit documents"
ON public.property_unit_documents
FOR ALL
USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_property_unit_documents_updated_at
BEFORE UPDATE ON public.property_unit_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Storage RLS for unit-documents bucket
CREATE POLICY "Property owners can manage unit document files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'unit-documents' AND
  EXISTS (
    SELECT 1 FROM public.property_units pu
    JOIN public.properties p ON pu.property_id = p.id
    WHERE pu.id::text = (storage.foldername(name))[1]
    AND (p.owner_id = auth.uid() OR (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
  )
);

CREATE POLICY "Approved tenants can view unit document files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'unit-documents' AND
  EXISTS (
    SELECT 1 FROM public.property_units pu
    JOIN public.properties p ON pu.property_id = p.id
    LEFT JOIN public.property_applications pa ON p.id = pa.property_id
    WHERE pu.id::text = (storage.foldername(name))[1]
    AND pa.tenant_id = auth.uid()
    AND pa.status = 'approved'
  )
);

CREATE POLICY "Admins can manage all unit document files"
ON storage.objects
FOR ALL
USING (bucket_id = 'unit-documents' AND is_admin(auth.uid()));

-- Strengthen property_documents RLS policies (ensure comprehensive coverage)
DROP POLICY IF EXISTS "Property owners can manage their documents" ON public.property_documents;
DROP POLICY IF EXISTS "Approved tenants can view property documents" ON public.property_documents;
DROP POLICY IF EXISTS "Admins can manage all property documents" ON public.property_documents;

CREATE POLICY "Property owners can manage their documents"
ON public.property_documents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_documents.property_id
    AND (p.owner_id = auth.uid() OR (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
  )
);

CREATE POLICY "Approved tenants can view property documents"
ON public.property_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    LEFT JOIN public.property_applications pa ON p.id = pa.property_id
    WHERE p.id = property_documents.property_id
    AND pa.tenant_id = auth.uid()
    AND pa.status = 'approved'
  )
);

CREATE POLICY "Admins can manage all property documents"
ON public.property_documents
FOR ALL
USING (is_admin(auth.uid()));