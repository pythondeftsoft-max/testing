-- Create portfolio asset documents table
CREATE TABLE public.portfolio_asset_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.portfolio_assets(id) ON DELETE CASCADE,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  parent_document_id UUID REFERENCES public.portfolio_asset_documents(id),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  expiration_date DATE,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document categories lookup table
CREATE TABLE public.asset_document_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  asset_category_ids UUID[] DEFAULT '{}',
  icon_name TEXT,
  color_theme TEXT DEFAULT 'blue',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default document categories
INSERT INTO public.asset_document_categories (name, display_name, description, icon_name, color_theme) VALUES
('purchase_contract', 'Purchase Contract', 'Property purchase agreements and contracts', 'FileText', 'green'),
('deed', 'Deed', 'Property deeds and title documents', 'ScrollText', 'blue'),
('insurance', 'Insurance', 'Insurance policies and certificates', 'Shield', 'orange'),
('inspection', 'Inspection Report', 'Property inspection reports and certifications', 'Search', 'yellow'),
('appraisal', 'Appraisal', 'Property appraisals and valuations', 'DollarSign', 'purple'),
('lease', 'Lease Agreement', 'Tenant lease agreements and renewals', 'Users', 'indigo'),
('maintenance', 'Maintenance Records', 'Maintenance and repair documentation', 'Wrench', 'red'),
('financial', 'Financial Documents', 'Financial statements, tax documents, etc.', 'Calculator', 'emerald'),
('legal', 'Legal Documents', 'Legal notices, permits, and compliance documents', 'Scale', 'slate'),
('other', 'Other', 'Miscellaneous documents', 'File', 'gray');

-- Enable RLS
ALTER TABLE public.portfolio_asset_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_document_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for portfolio_asset_documents
CREATE POLICY "Portfolio members can view asset documents" 
ON public.portfolio_asset_documents 
FOR SELECT 
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]));

CREATE POLICY "Portfolio editors can manage asset documents" 
ON public.portfolio_asset_documents 
FOR ALL 
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]));

-- Create RLS policies for asset_document_categories
CREATE POLICY "Anyone can view active document categories" 
ON public.asset_document_categories 
FOR SELECT 
USING (is_active = true);

-- Create indexes for performance
CREATE INDEX idx_portfolio_asset_documents_asset_id ON public.portfolio_asset_documents(asset_id);
CREATE INDEX idx_portfolio_asset_documents_portfolio_id ON public.portfolio_asset_documents(portfolio_id);
CREATE INDEX idx_portfolio_asset_documents_document_type ON public.portfolio_asset_documents(document_type);
CREATE INDEX idx_portfolio_asset_documents_expiration_date ON public.portfolio_asset_documents(expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX idx_portfolio_asset_documents_tags ON public.portfolio_asset_documents USING GIN(tags);

-- Create trigger for updated_at
CREATE TRIGGER update_portfolio_asset_documents_updated_at
BEFORE UPDATE ON public.portfolio_asset_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_portfolio_assets_updated_at();

-- Create storage bucket for asset documents
INSERT INTO storage.buckets (id, name, public) VALUES ('asset-documents', 'asset-documents', false);

-- Create storage policies for asset documents
CREATE POLICY "Portfolio members can view asset documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'asset-documents' AND 
       EXISTS (
         SELECT 1 FROM public.portfolio_asset_documents pad
         WHERE pad.file_path = name
         AND has_portfolio_role(pad.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
       ));

CREATE POLICY "Portfolio editors can upload asset documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'asset-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Portfolio editors can update asset documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'asset-documents' AND 
       EXISTS (
         SELECT 1 FROM public.portfolio_asset_documents pad
         WHERE pad.file_path = name
         AND has_portfolio_role(pad.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
       ));

CREATE POLICY "Portfolio editors can delete asset documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'asset-documents' AND 
       EXISTS (
         SELECT 1 FROM public.portfolio_asset_documents pad
         WHERE pad.file_path = name
         AND has_portfolio_role(pad.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
       ));