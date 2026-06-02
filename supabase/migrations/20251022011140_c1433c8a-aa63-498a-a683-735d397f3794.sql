-- Fix tenant documents storage deadlock by optimizing RLS policies
-- Drop existing policies that may be causing lock contention
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Property owners can view tenant document files" ON storage.objects;

-- Recreate with optimized logic for tenant-documents bucket
CREATE POLICY "Users can upload their own tenant documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'tenant-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own tenant documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'tenant-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own tenant documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'tenant-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own tenant documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'tenant-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add policy for property owners to view tenant documents
CREATE POLICY "Property owners can view tenant document files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'tenant-documents' 
  AND EXISTS (
    SELECT 1 
    FROM tenant_documents td
    JOIN property_applications pa ON pa.tenant_id = td.user_id
    JOIN properties p ON p.id = pa.property_id
    WHERE td.file_path = name
    AND p.owner_id = auth.uid()
    AND pa.status = 'approved'
  )
);