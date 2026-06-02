-- Create property-documents storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-documents', 'property-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for property documents
CREATE POLICY "Property owners can upload their property documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'property-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Property owners can view their property documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'property-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all property documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'property-documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'admin'
  )
);