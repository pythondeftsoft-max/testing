-- Create tenant insurance table for renters insurance tracking
CREATE TABLE public.tenant_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  property_id UUID NOT NULL,
  unit_id UUID,
  provider_name TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  policy_type TEXT NOT NULL DEFAULT 'third_party',
  liability_coverage NUMERIC DEFAULT 0,
  personal_property_coverage NUMERIC DEFAULT 0,
  effective_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  premium_amount NUMERIC DEFAULT 0,
  payment_frequency TEXT DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.tenant_insurance ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant insurance access
CREATE POLICY "Property owners can view insurance for their properties" 
ON public.tenant_insurance 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM properties 
  WHERE properties.id = tenant_insurance.property_id 
  AND properties.owner_id = auth.uid()
));

CREATE POLICY "Property owners can manage insurance for their properties" 
ON public.tenant_insurance 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM properties 
  WHERE properties.id = tenant_insurance.property_id 
  AND properties.owner_id = auth.uid()
));

CREATE POLICY "Portfolio members can view insurance for portfolio properties" 
ON public.tenant_insurance 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM properties p 
  WHERE p.id = tenant_insurance.property_id 
  AND p.portfolio_id IS NOT NULL 
  AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
));

CREATE POLICY "Portfolio managers can manage insurance for portfolio properties" 
ON public.tenant_insurance 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM properties p 
  WHERE p.id = tenant_insurance.property_id 
  AND p.portfolio_id IS NOT NULL 
  AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
));

CREATE POLICY "Tenants can view their own insurance records" 
ON public.tenant_insurance 
FOR SELECT 
USING (tenant_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_tenant_insurance_updated_at
BEFORE UPDATE ON public.tenant_insurance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_tenant_insurance_property_id ON public.tenant_insurance(property_id);
CREATE INDEX idx_tenant_insurance_tenant_id ON public.tenant_insurance(tenant_id);
CREATE INDEX idx_tenant_insurance_expiration_date ON public.tenant_insurance(expiration_date);
CREATE INDEX idx_tenant_insurance_is_active ON public.tenant_insurance(is_active);