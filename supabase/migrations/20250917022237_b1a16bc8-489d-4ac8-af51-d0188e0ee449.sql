-- Add comprehensive financial fields to properties table for enhanced trial balance accuracy

-- Add asset accounts
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS accounts_receivable NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_deposits_receivable NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS prepaid_expenses NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS beginning_cash_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS ending_cash_balance NUMERIC DEFAULT 0;

-- Add liability accounts  
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS security_deposits_held NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS accounts_payable NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS accrued_expenses NUMERIC DEFAULT 0;

-- Add detailed expense accounts
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS property_taxes NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS utilities_expense NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS maintenance_reserves NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS property_management_fees NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS advertising_expense NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS legal_professional_fees NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS depreciation_expense NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_operating_expenses NUMERIC DEFAULT 0;

-- Add additional income accounts
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS late_fee_income NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pet_fee_income NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS application_fee_income NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_income NUMERIC DEFAULT 0;

-- Add metadata for financial tracking
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS last_financial_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS financial_notes TEXT,
ADD COLUMN IF NOT EXISTS accounting_period_start DATE,
ADD COLUMN IF NOT EXISTS accounting_period_end DATE;

-- Add comments for clarity
COMMENT ON COLUMN public.properties.accounts_receivable IS 'Outstanding rent and fees owed by tenants';
COMMENT ON COLUMN public.properties.security_deposits_held IS 'Security deposits held in trust for tenants';
COMMENT ON COLUMN public.properties.property_taxes IS 'Annual property tax expense';
COMMENT ON COLUMN public.properties.utilities_expense IS 'Monthly utility costs (if owner-paid)';
COMMENT ON COLUMN public.properties.maintenance_reserves IS 'Funds set aside for future maintenance';
COMMENT ON COLUMN public.properties.depreciation_expense IS 'Annual depreciation expense for tax purposes';