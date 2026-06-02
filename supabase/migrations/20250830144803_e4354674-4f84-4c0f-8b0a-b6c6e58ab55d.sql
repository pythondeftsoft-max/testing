-- Create property-documents storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-documents', 'property-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for property-documents bucket
-- Property owners can view documents for their properties
CREATE POLICY "Property owners can view their documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'property-documents' AND 
  EXISTS (
    SELECT 1 FROM properties p 
    JOIN property_documents pd ON p.id = pd.property_id 
    WHERE pd.file_path = objects.name 
    AND p.owner_id = auth.uid()
  )
);

-- Property owners can upload documents for their properties
CREATE POLICY "Property owners can upload documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'property-documents' AND 
  auth.uid() IS NOT NULL
);

-- Property owners can update documents for their properties
CREATE POLICY "Property owners can update their documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'property-documents' AND 
  EXISTS (
    SELECT 1 FROM properties p 
    JOIN property_documents pd ON p.id = pd.property_id 
    WHERE pd.file_path = objects.name 
    AND p.owner_id = auth.uid()
  )
);

-- Property owners can delete documents for their properties
CREATE POLICY "Property owners can delete their documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'property-documents' AND 
  EXISTS (
    SELECT 1 FROM properties p 
    JOIN property_documents pd ON p.id = pd.property_id 
    WHERE pd.file_path = objects.name 
    AND p.owner_id = auth.uid()
  )
);

-- Admin users can access all documents
CREATE POLICY "Admins can access all property documents" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'property-documents' AND 
  is_admin(auth.uid())
);