-- Create property_tenant_requests table to track when landlords request tenants
CREATE TABLE public.property_tenant_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create property_pushes table to track admin pushes to tenants
CREATE TABLE public.property_pushes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  pushed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add metadata column to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Enable Row Level Security
ALTER TABLE public.property_tenant_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_pushes ENABLE ROW LEVEL SECURITY;

-- RLS policies for property_tenant_requests
CREATE POLICY "Property owners can manage their tenant requests" 
ON public.property_tenant_requests 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.properties 
  WHERE id = property_tenant_requests.property_id 
  AND owner_id = auth.uid()
));

CREATE POLICY "Admins can view all tenant requests" 
ON public.property_tenant_requests 
FOR SELECT 
USING (is_admin(auth.uid()));

-- RLS policies for property_pushes (admin-only)
CREATE POLICY "Admins can manage all property pushes" 
ON public.property_pushes 
FOR ALL 
USING (is_admin(auth.uid()));

-- Add foreign key constraints
ALTER TABLE public.property_tenant_requests 
ADD CONSTRAINT fk_property_tenant_requests_property_id 
FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.property_tenant_requests 
ADD CONSTRAINT fk_property_tenant_requests_requested_by 
FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.property_pushes 
ADD CONSTRAINT fk_property_pushes_property_id 
FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.property_pushes 
ADD CONSTRAINT fk_property_pushes_tenant_id 
FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.property_pushes 
ADD CONSTRAINT fk_property_pushes_admin_id 
FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_property_tenant_requests_property_id ON public.property_tenant_requests(property_id);
CREATE INDEX idx_property_tenant_requests_status ON public.property_tenant_requests(status);
CREATE INDEX idx_property_pushes_property_id ON public.property_pushes(property_id);
CREATE INDEX idx_property_pushes_tenant_id ON public.property_pushes(tenant_id);
CREATE INDEX idx_property_pushes_admin_id ON public.property_pushes(admin_id);

-- Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_property_tenant_requests_updated_at
  BEFORE UPDATE ON public.property_tenant_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_pushes_updated_at
  BEFORE UPDATE ON public.property_pushes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();