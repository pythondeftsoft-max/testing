-- Create HAP payment tracking tables

-- Table for HAP payee configurations (banking info for each property)
CREATE TABLE public.hap_payee_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  payee_type TEXT NOT NULL DEFAULT 'landlord' CHECK (payee_type IN ('landlord', 'property_manager')),
  payee_name TEXT NOT NULL,
  bank_name TEXT,
  routing_number TEXT,
  account_number_encrypted TEXT, -- Will store encrypted account numbers
  account_type TEXT DEFAULT 'checking' CHECK (account_type IN ('checking', 'savings')),
  w9_form_url TEXT,
  direct_deposit_form_url TEXT,
  pm_agreement_url TEXT,
  forms_submitted_to_pha BOOLEAN DEFAULT FALSE,
  pha_approval_status TEXT DEFAULT 'pending' CHECK (pha_approval_status IN ('pending', 'approved', 'rejected')),
  pha_approval_date DATE,
  pha_notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Table for HAP payment records
CREATE TABLE public.hap_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id),
  tenant_id UUID REFERENCES public.profiles(id),
  hap_payee_config_id UUID REFERENCES public.hap_payee_configs(id),
  payment_period_start DATE NOT NULL,
  payment_period_end DATE NOT NULL,
  expected_amount NUMERIC(10,2) NOT NULL,
  actual_amount NUMERIC(10,2),
  payment_date DATE,
  payment_method TEXT DEFAULT 'ach' CHECK (payment_method IN ('ach', 'check', 'wire')),
  payment_status TEXT DEFAULT 'expected' CHECK (payment_status IN ('expected', 'received', 'late', 'missing')),
  verification_method TEXT DEFAULT 'manual' CHECK (verification_method IN ('plaid', 'manual', 'bank_import')),
  bank_transaction_id TEXT,
  receipt_url TEXT,
  pha_voucher_number TEXT,
  notes TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recorded_by UUID REFERENCES public.profiles(id)
);

-- Table for PHA information and contacts
CREATE TABLE public.pha_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pha_name TEXT NOT NULL,
  pha_code TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zipcode TEXT,
  website_url TEXT,
  payment_schedule TEXT DEFAULT 'monthly', -- monthly, quarterly, etc.
  typical_payment_day INTEGER DEFAULT 1, -- day of month they typically pay
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add PHA reference to rent_splits table if it doesn't exist
ALTER TABLE public.rent_splits 
ADD COLUMN IF NOT EXISTS pha_id UUID REFERENCES public.pha_contacts(id);

-- Enable RLS on new tables
ALTER TABLE public.hap_payee_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hap_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pha_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hap_payee_configs
CREATE POLICY "Property owners can manage HAP payee configs" 
ON public.hap_payee_configs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = hap_payee_configs.property_id 
    AND properties.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all HAP payee configs" 
ON public.hap_payee_configs 
FOR SELECT 
USING (is_admin(auth.uid()));

-- RLS Policies for hap_payments
CREATE POLICY "Property owners can manage HAP payments" 
ON public.hap_payments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = hap_payments.property_id 
    AND properties.owner_id = auth.uid()
  )
);

CREATE POLICY "Tenants can view their HAP payments" 
ON public.hap_payments 
FOR SELECT 
USING (tenant_id = auth.uid());

CREATE POLICY "Admins can view all HAP payments" 
ON public.hap_payments 
FOR SELECT 
USING (is_admin(auth.uid()));

-- RLS Policies for pha_contacts
CREATE POLICY "Authenticated users can view PHA contacts" 
ON public.pha_contacts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Property owners can manage PHA contacts" 
ON public.pha_contacts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.owner_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_hap_payee_configs_property_id ON public.hap_payee_configs(property_id);
CREATE INDEX idx_hap_payments_property_id ON public.hap_payments(property_id);
CREATE INDEX idx_hap_payments_tenant_id ON public.hap_payments(tenant_id);
CREATE INDEX idx_hap_payments_payment_date ON public.hap_payments(payment_date);
CREATE INDEX idx_hap_payments_payment_status ON public.hap_payments(payment_status);

-- Create trigger for updated_at
CREATE TRIGGER update_hap_payee_configs_updated_at
  BEFORE UPDATE ON public.hap_payee_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hap_payments_updated_at
  BEFORE UPDATE ON public.hap_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pha_contacts_updated_at
  BEFORE UPDATE ON public.pha_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();