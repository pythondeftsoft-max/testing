-- Enhanced Lease Renewal System
-- Add new columns to lease_renewals table for different renewal types
ALTER TABLE public.lease_renewals 
ADD COLUMN renewal_type TEXT NOT NULL DEFAULT 'platform_system' CHECK (renewal_type IN ('platform_system', 'platform_custom', 'external')),
ADD COLUMN custom_template_uploaded BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN external_lease_document_path TEXT;

-- Create lease renewal templates table for landlord custom templates
CREATE TABLE public.lease_renewal_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  template_variables JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on lease renewal templates
ALTER TABLE public.lease_renewal_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for lease renewal templates
CREATE POLICY "Landlords can manage their own templates" 
ON public.lease_renewal_templates 
FOR ALL 
USING (landlord_id = auth.uid());

-- Add template_id column to lease_renewal_contracts to reference custom templates
ALTER TABLE public.lease_renewal_contracts 
ADD COLUMN template_id UUID REFERENCES public.lease_renewal_templates(id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lease_renewal_templates_updated_at
BEFORE UPDATE ON public.lease_renewal_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_lease_renewal_templates_landlord_id ON public.lease_renewal_templates(landlord_id);
CREATE INDEX idx_lease_renewals_renewal_type ON public.lease_renewals(renewal_type);