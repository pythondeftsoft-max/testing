-- Phase 1: Database Enhancements for HAP Workflow

-- Add Plaid integration fields to hap_payee_configs
ALTER TABLE public.hap_payee_configs 
ADD COLUMN plaid_access_token TEXT,
ADD COLUMN plaid_account_id TEXT,
ADD COLUMN plaid_institution_id TEXT,
ADD COLUMN plaid_institution_name TEXT,
ADD COLUMN auto_tracking_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN document_w9_url TEXT,
ADD COLUMN document_direct_deposit_url TEXT,
ADD COLUMN document_pm_agreement_url TEXT,
ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;

-- Add Plaid tracking fields to hap_payments
ALTER TABLE public.hap_payments 
ADD COLUMN plaid_transaction_id TEXT,
ADD COLUMN matched_via_plaid BOOLEAN DEFAULT FALSE,
ADD COLUMN plaid_match_confidence NUMERIC(3,2),
ADD COLUMN rent_ledger_posted BOOLEAN DEFAULT FALSE,
ADD COLUMN rent_ledger_entry_id UUID;

-- Create table for rent ledger entries
CREATE TABLE public.rent_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    payment_date DATE NOT NULL,
    payment_type TEXT NOT NULL DEFAULT 'rent',
    payment_source TEXT NOT NULL DEFAULT 'tenant',
    description TEXT,
    reference_number TEXT,
    hap_payment_id UUID REFERENCES public.hap_payments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for rent_ledger
ALTER TABLE public.rent_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property owners can manage rent ledger entries" 
ON public.rent_ledger 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = rent_ledger.property_id 
    AND properties.owner_id = auth.uid()
));

CREATE POLICY "Tenants can view their rent ledger entries" 
ON public.rent_ledger 
FOR SELECT 
USING (tenant_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_hap_payments_plaid_transaction ON public.hap_payments(plaid_transaction_id);
CREATE INDEX idx_rent_ledger_property_tenant ON public.rent_ledger(property_id, tenant_id);
CREATE INDEX idx_rent_ledger_payment_date ON public.rent_ledger(payment_date);
CREATE INDEX idx_hap_payee_configs_plaid_account ON public.hap_payee_configs(plaid_account_id);

-- Create trigger for updating rent_ledger updated_at
CREATE TRIGGER update_rent_ledger_updated_at
BEFORE UPDATE ON public.rent_ledger
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update permissions for roles (ensure only landlords and property managers can access HAP features)
CREATE OR REPLACE FUNCTION public.can_access_hap_features(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id 
        AND user_type IN ('individual_owner', 'property_manager', 'admin')
    );
$$;

-- Enhanced RLS policies for HAP tables
DROP POLICY IF EXISTS "Property owners can manage HAP payee configs" ON public.hap_payee_configs;
CREATE POLICY "Property owners can manage HAP payee configs" 
ON public.hap_payee_configs 
FOR ALL 
USING (
    public.can_access_hap_features(auth.uid()) 
    AND EXISTS (
        SELECT 1 FROM public.properties 
        WHERE properties.id = hap_payee_configs.property_id 
        AND properties.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Property owners can manage HAP payments" ON public.hap_payments;
CREATE POLICY "Property owners can manage HAP payments" 
ON public.hap_payments 
FOR ALL 
USING (
    public.can_access_hap_features(auth.uid()) 
    AND EXISTS (
        SELECT 1 FROM public.properties 
        WHERE properties.id = hap_payments.property_id 
        AND properties.owner_id = auth.uid()
    )
);

-- Add comments for documentation
COMMENT ON COLUMN public.hap_payee_configs.plaid_access_token IS 'Encrypted Plaid access token for bank account integration';
COMMENT ON COLUMN public.hap_payee_configs.auto_tracking_enabled IS 'Whether automatic payment tracking via Plaid is enabled';
COMMENT ON COLUMN public.hap_payments.matched_via_plaid IS 'Whether this payment was automatically matched via Plaid integration';
COMMENT ON TABLE public.rent_ledger IS 'Comprehensive rent payment ledger including HAP and tenant payments';