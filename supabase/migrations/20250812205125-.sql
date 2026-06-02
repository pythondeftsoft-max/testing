-- Create storage bucket for lease renewal documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Create storage policies for lease renewal documents
CREATE POLICY "Landlords can upload lease documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Landlords can view their lease documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Landlords can delete their lease documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);