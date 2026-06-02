-- Create property_documents table for storing property-related documents
CREATE TABLE IF NOT EXISTS public.property_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for property_documents
CREATE POLICY "Property owners can manage their property documents"
ON public.property_documents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = property_documents.property_id 
    AND properties.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all property documents"
ON public.property_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'admin'
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_property_documents_property_id ON public.property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_uploaded_by ON public.property_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_property_documents_type ON public.property_documents(document_type);