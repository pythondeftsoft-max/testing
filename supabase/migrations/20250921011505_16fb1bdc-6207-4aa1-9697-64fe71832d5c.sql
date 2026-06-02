-- Add missing fields to property_units table for rent roll functionality
ALTER TABLE public.property_units 
ADD COLUMN IF NOT EXISTS rent_cycle TEXT DEFAULT 'monthly' CHECK (rent_cycle IN ('monthly', 'weekly', 'biweekly')),
ADD COLUMN IF NOT EXISTS prepayments_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_balance_update TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create rent_credits table for tracking recurring tenant credits
CREATE TABLE IF NOT EXISTS public.rent_credits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.property_units(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    credit_name TEXT NOT NULL,
    credit_amount NUMERIC NOT NULL DEFAULT 0,
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'weekly', 'biweekly', 'quarterly', 'annually')),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenant_prepayments table for tracking advance payments
CREATE TABLE IF NOT EXISTS public.tenant_prepayments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.property_units(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    payment_amount NUMERIC NOT NULL DEFAULT 0,
    applied_amount NUMERIC NOT NULL DEFAULT 0,
    balance NUMERIC NOT NULL DEFAULT 0,
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.rent_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_prepayments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for rent_credits
CREATE POLICY "Property owners can manage rent credits" 
ON public.rent_credits 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = rent_credits.property_id 
    AND properties.owner_id = auth.uid()
));

-- Create RLS policies for tenant_prepayments
CREATE POLICY "Property owners can manage tenant prepayments" 
ON public.tenant_prepayments 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = tenant_prepayments.property_id 
    AND properties.owner_id = auth.uid()
));

-- Create trigger for updating timestamps on rent_credits
CREATE OR REPLACE FUNCTION public.update_rent_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rent_credits_updated_at
  BEFORE UPDATE ON public.rent_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rent_credits_updated_at();

-- Create trigger for updating timestamps on tenant_prepayments  
CREATE OR REPLACE FUNCTION public.update_tenant_prepayments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_prepayments_updated_at
  BEFORE UPDATE ON public.tenant_prepayments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_prepayments_updated_at();