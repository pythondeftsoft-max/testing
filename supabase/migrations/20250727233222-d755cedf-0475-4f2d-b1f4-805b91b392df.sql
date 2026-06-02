-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Property owners can view their property documents" ON storage.objects;
DROP POLICY IF EXISTS "Property owners can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Property owners can update their property documents" ON storage.objects;
DROP POLICY IF EXISTS "Property owners can delete their property documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all property documents" ON storage.objects;
DROP POLICY IF EXISTS "Tenants can view documents for their approved properties" ON storage.objects;

-- Ensure bucket exists with proper settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('property-documents', 'property-documents', false, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Create RLS policies for property-documents storage bucket

-- Policy: Property owners can upload documents for their properties
CREATE POLICY "Property owners can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'property-documents' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = (storage.foldername(name))[1]::uuid 
    AND owner_id = auth.uid()
  )
);

-- Policy: Property owners can view documents for their properties
CREATE POLICY "Property owners can view their property documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'property-documents' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = (storage.foldername(name))[1]::uuid 
    AND owner_id = auth.uid()
  )
);

-- Policy: Property owners can update documents for their properties
CREATE POLICY "Property owners can update their property documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'property-documents' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = (storage.foldername(name))[1]::uuid 
    AND owner_id = auth.uid()
  )
);

-- Policy: Property owners can delete documents for their properties
CREATE POLICY "Property owners can delete their property documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'property-documents' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = (storage.foldername(name))[1]::uuid 
    AND owner_id = auth.uid()
  )
);

-- Policy: Admins can manage all property documents
CREATE POLICY "Admins can manage all property documents" ON storage.objects
FOR ALL USING (
  bucket_id = 'property-documents' 
  AND is_admin(auth.uid())
);

-- Policy: Tenants can view documents for properties they have approved applications
CREATE POLICY "Tenants can view documents for their approved properties" ON storage.objects
FOR SELECT USING (
  bucket_id = 'property-documents' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.property_applications pa
    JOIN public.properties p ON pa.property_id = p.id
    WHERE p.id = (storage.foldername(name))[1]::uuid 
    AND pa.tenant_id = auth.uid()
    AND pa.status = 'approved'
  )
);