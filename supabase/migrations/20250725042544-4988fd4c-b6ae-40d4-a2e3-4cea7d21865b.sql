-- Create enum for tax entity types
CREATE TYPE tax_entity_type AS ENUM ('individual', 'sole_proprietorship', 'partnership', 'c_corporation', 's_corporation', 'llc', 'trust', 'estate', 'other');

-- Create enum for tax form types
CREATE TYPE tax_form_type AS ENUM ('1099_misc', '1099_nec', '1099_k', '1099_int', '1099_div');

-- Create enum for tax status
CREATE TYPE tax_status AS ENUM ('pending', 'collected', 'verified', 'expired', 'exempt');

-- Create tax_profiles table for W-9 information
CREATE TABLE public.tax_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    portfolio_id UUID,
    entity_type tax_entity_type NOT NULL DEFAULT 'individual',
    business_name TEXT,
    individual_name TEXT,
    tax_id_number TEXT, -- SSN or EIN (encrypted)
    tax_id_type TEXT CHECK (tax_id_type IN ('ssn', 'ein', 'itin')) NOT NULL DEFAULT 'ssn',
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'US',
    backup_withholding_exempt BOOLEAN DEFAULT FALSE,
    fatca_exempt BOOLEAN DEFAULT FALSE,
    w9_form_url TEXT,
    w9_submitted_at TIMESTAMP WITH TIME ZONE,
    w9_verified_at TIMESTAMP WITH TIME ZONE,
    w9_verified_by UUID,
    status tax_status NOT NULL DEFAULT 'pending',
    expiration_date DATE, -- W-9 forms should be updated every 3 years
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    
    UNIQUE(user_id, portfolio_id),
    CONSTRAINT valid_entity_info CHECK (
        (entity_type = 'individual' AND individual_name IS NOT NULL) OR
        (entity_type != 'individual' AND business_name IS NOT NULL)
    )
);

-- Create tax_transactions table for tracking 1099-eligible payments
CREATE TABLE public.tax_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id UUID,
    payer_id UUID NOT NULL, -- The user/entity making the payment
    payee_id UUID NOT NULL, -- The user/entity receiving the payment
    property_id UUID,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('rent', 'repair', 'maintenance', 'management_fee', 'commission', 'legal_fee', 'accounting_fee', 'advertising', 'insurance', 'utilities', 'other')),
    amount NUMERIC(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    tax_year INTEGER NOT NULL,
    form_type tax_form_type,
    description TEXT,
    invoice_number TEXT,
    vendor_name TEXT,
    category_code TEXT, -- Box number on 1099 form
    is_tax_exempt BOOLEAN DEFAULT FALSE,
    exempt_reason TEXT,
    original_transaction_id UUID, -- Link to rent_payments, maintenance_requests, etc.
    original_transaction_table TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID
);

-- Create tax_forms_1099 table for generated forms
CREATE TABLE public.tax_forms_1099 (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id UUID,
    payer_id UUID NOT NULL,
    payee_id UUID NOT NULL,
    tax_year INTEGER NOT NULL,
    form_type tax_form_type NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    box_amounts JSONB NOT NULL DEFAULT '{}', -- Store amounts for each box on the form
    form_status TEXT CHECK (form_status IN ('draft', 'generated', 'filed', 'corrected', 'voided')) NOT NULL DEFAULT 'draft',
    generated_at TIMESTAMP WITH TIME ZONE,
    filed_at TIMESTAMP WITH TIME ZONE,
    filed_by UUID,
    correction_of_form_id UUID, -- Reference to original form if this is a correction
    pdf_url TEXT,
    irs_submission_id TEXT,
    irs_acknowledgment_code TEXT,
    recipient_copy_sent_at TIMESTAMP WITH TIME ZONE,
    recipient_delivery_method TEXT CHECK (recipient_delivery_method IN ('email', 'mail', 'portal')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    
    UNIQUE(payer_id, payee_id, tax_year, form_type)
);

-- Create tax_thresholds table for IRS reporting requirements
CREATE TABLE public.tax_thresholds (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    form_type tax_form_type NOT NULL,
    tax_year INTEGER NOT NULL,
    threshold_amount NUMERIC(10,2) NOT NULL,
    category_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(form_type, tax_year, category_description)
);

-- Create indexes for performance
CREATE INDEX idx_tax_transactions_payee_year ON public.tax_transactions (payee_id, tax_year);
CREATE INDEX idx_tax_transactions_payer_year ON public.tax_transactions (payer_id, tax_year);
CREATE INDEX idx_tax_transactions_portfolio ON public.tax_transactions (portfolio_id);
CREATE INDEX idx_tax_transactions_payment_date ON public.tax_transactions (payment_date);

CREATE INDEX idx_tax_forms_payer_year ON public.tax_forms_1099 (payer_id, tax_year);
CREATE INDEX idx_tax_forms_payee_year ON public.tax_forms_1099 (payee_id, tax_year);
CREATE INDEX idx_tax_forms_portfolio ON public.tax_forms_1099 (portfolio_id);

-- Enable RLS on all tables
ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_forms_1099 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_thresholds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tax_profiles
CREATE POLICY "Users can manage their own tax profiles" 
ON public.tax_profiles 
FOR ALL 
USING (user_id = auth.uid());

CREATE POLICY "Portfolio members can view tax profiles" 
ON public.tax_profiles 
FOR SELECT 
USING (
    portfolio_id IS NOT NULL AND 
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
);

CREATE POLICY "Admins can view all tax profiles" 
ON public.tax_profiles 
FOR SELECT 
USING (is_admin(auth.uid()));

-- RLS Policies for tax_transactions
CREATE POLICY "Users can view their tax transactions" 
ON public.tax_transactions 
FOR SELECT 
USING (payer_id = auth.uid() OR payee_id = auth.uid());

CREATE POLICY "Portfolio managers can manage tax transactions" 
ON public.tax_transactions 
FOR ALL 
USING (
    portfolio_id IS NOT NULL AND 
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
);

CREATE POLICY "System can insert tax transactions" 
ON public.tax_transactions 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for tax_forms_1099
CREATE POLICY "Users can view their 1099 forms" 
ON public.tax_forms_1099 
FOR SELECT 
USING (payer_id = auth.uid() OR payee_id = auth.uid());

CREATE POLICY "Portfolio managers can manage 1099 forms" 
ON public.tax_forms_1099 
FOR ALL 
USING (
    portfolio_id IS NOT NULL AND 
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
);

-- RLS Policies for tax_thresholds
CREATE POLICY "Anyone can view active tax thresholds" 
ON public.tax_thresholds 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage tax thresholds" 
ON public.tax_thresholds 
FOR ALL 
USING (is_admin(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_tax_profiles_updated_at
    BEFORE UPDATE ON public.tax_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_transactions_updated_at
    BEFORE UPDATE ON public.tax_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_forms_1099_updated_at
    BEFORE UPDATE ON public.tax_forms_1099
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_thresholds_updated_at
    BEFORE UPDATE ON public.tax_thresholds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tax thresholds for current and upcoming years
INSERT INTO public.tax_thresholds (form_type, tax_year, threshold_amount, category_description) VALUES
-- 2024 thresholds
('1099_misc', 2024, 600.00, 'Rents, services, other income'),
('1099_nec', 2024, 600.00, 'Nonemployee compensation'),
('1099_k', 2024, 20000.00, 'Payment card and third party network transactions'),
-- 2025 thresholds (anticipated)
('1099_misc', 2025, 600.00, 'Rents, services, other income'),
('1099_nec', 2025, 600.00, 'Nonemployee compensation'),
('1099_k', 2025, 600.00, 'Payment card and third party network transactions'),
-- 2026 thresholds (anticipated)
('1099_misc', 2026, 600.00, 'Rents, services, other income'),
('1099_nec', 2026, 600.00, 'Nonemployee compensation'),
('1099_k', 2026, 600.00, 'Payment card and third party network transactions');

-- Create function to automatically track transactions for 1099 reporting
CREATE OR REPLACE FUNCTION public.track_tax_transaction(
    p_portfolio_id UUID,
    p_payer_id UUID,
    p_payee_id UUID,
    p_property_id UUID,
    p_transaction_type TEXT,
    p_amount NUMERIC,
    p_payment_date DATE,
    p_description TEXT DEFAULT NULL,
    p_original_transaction_id UUID DEFAULT NULL,
    p_original_transaction_table TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id UUID;
    v_tax_year INTEGER;
    v_threshold NUMERIC;
    v_form_type tax_form_type;
BEGIN
    -- Extract tax year from payment date
    v_tax_year := EXTRACT(YEAR FROM p_payment_date);
    
    -- Determine form type based on transaction type
    v_form_type := CASE 
        WHEN p_transaction_type IN ('repair', 'maintenance', 'legal_fee', 'accounting_fee') THEN '1099_misc'::tax_form_type
        WHEN p_transaction_type IN ('management_fee', 'commission') THEN '1099_nec'::tax_form_type
        ELSE '1099_misc'::tax_form_type
    END;
    
    -- Get threshold for this form type and year
    SELECT threshold_amount INTO v_threshold
    FROM public.tax_thresholds
    WHERE form_type = v_form_type 
    AND tax_year = v_tax_year 
    AND is_active = true
    LIMIT 1;
    
    -- Only track if amount meets threshold or if we want to track all transactions
    IF v_threshold IS NULL OR p_amount >= v_threshold OR p_amount >= 100 THEN
        INSERT INTO public.tax_transactions (
            portfolio_id,
            payer_id,
            payee_id,
            property_id,
            transaction_type,
            amount,
            payment_date,
            tax_year,
            form_type,
            description,
            original_transaction_id,
            original_transaction_table,
            created_by
        ) VALUES (
            p_portfolio_id,
            p_payer_id,
            p_payee_id,
            p_property_id,
            p_transaction_type,
            p_amount,
            p_payment_date,
            v_tax_year,
            v_form_type,
            p_description,
            p_original_transaction_id,
            p_original_transaction_table,
            auth.uid()
        ) RETURNING id INTO v_transaction_id;
    END IF;
    
    RETURN v_transaction_id;
END;
$$;

-- Create function to check if 1099 is required for a payee
CREATE OR REPLACE FUNCTION public.check_1099_requirement(
    p_payer_id UUID,
    p_payee_id UUID,
    p_tax_year INTEGER,
    p_form_type tax_form_type DEFAULT '1099_misc'::tax_form_type
)
RETURNS TABLE(
    requires_1099 BOOLEAN,
    total_amount NUMERIC,
    threshold_amount NUMERIC,
    transaction_count INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
    v_total_amount NUMERIC := 0;
    v_threshold NUMERIC := 600;
    v_count INTEGER := 0;
BEGIN
    -- Get threshold for this form type and year
    SELECT tax_thresholds.threshold_amount INTO v_threshold
    FROM public.tax_thresholds
    WHERE tax_thresholds.form_type = p_form_type 
    AND tax_thresholds.tax_year = p_tax_year 
    AND tax_thresholds.is_active = true
    LIMIT 1;
    
    -- Calculate total payments for this payee
    SELECT 
        COALESCE(SUM(tt.amount), 0),
        COUNT(*)
    INTO v_total_amount, v_count
    FROM public.tax_transactions tt
    WHERE tt.payer_id = p_payer_id
    AND tt.payee_id = p_payee_id
    AND tt.tax_year = p_tax_year
    AND (tt.form_type = p_form_type OR tt.form_type IS NULL)
    AND NOT tt.is_tax_exempt;
    
    RETURN QUERY SELECT 
        (v_total_amount >= v_threshold) as requires_1099,
        v_total_amount as total_amount,
        v_threshold as threshold_amount,
        v_count as transaction_count;
END;
$$;