-- Create storage bucket for tenant documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tenant-documents', 'tenant-documents', false);

-- Create RLS policies for tenant documents
CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'tenant-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tenant-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'tenant-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create a table to track document metadata
CREATE TABLE public.tenant_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('lease', 'hap', 'income', 'identification', 'other')),
  file_size bigint,
  mime_type text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for tenant_documents
ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant_documents
CREATE POLICY "Users can manage their own document records" 
ON public.tenant_documents 
FOR ALL 
USING (user_id = auth.uid());

-- Property owners can view documents of their tenants  
CREATE POLICY "Property owners can view tenant documents" 
ON public.tenant_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM property_applications pa 
    JOIN properties p ON pa.property_id = p.id 
    WHERE pa.tenant_id = tenant_documents.user_id 
    AND p.owner_id = auth.uid() 
    AND pa.status = 'approved'
  )
);