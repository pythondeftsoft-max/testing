-- Create tenant_balances table for tracking running balances per tenant
CREATE TABLE public.tenant_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  property_id UUID NOT NULL,
  balance_amount NUMERIC NOT NULL DEFAULT 0,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  previous_balance NUMERIC NOT NULL DEFAULT 0,
  charges_amount NUMERIC NOT NULL DEFAULT 0,
  payments_amount NUMERIC NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.tenant_balances ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant_balances
CREATE POLICY "Property owners can view tenant balances for their properties"
ON public.tenant_balances 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.properties p 
  WHERE p.id = tenant_balances.property_id 
  AND p.owner_id = auth.uid()
));

CREATE POLICY "Property owners can manage tenant balances for their properties"
ON public.tenant_balances 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.properties p 
  WHERE p.id = tenant_balances.property_id 
  AND p.owner_id = auth.uid()
));

-- Create index for faster queries
CREATE INDEX idx_tenant_balances_tenant_property ON public.tenant_balances(tenant_id, property_id);
CREATE INDEX idx_tenant_balances_as_of_date ON public.tenant_balances(as_of_date);

-- Add trigger for updating updated_at
CREATE TRIGGER update_tenant_balances_updated_at
BEFORE UPDATE ON public.tenant_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();