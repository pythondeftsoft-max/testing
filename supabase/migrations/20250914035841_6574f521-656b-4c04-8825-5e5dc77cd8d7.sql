-- Add missing financial fields for balance sheet reporting
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS outstanding_mortgage_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cash_reserves NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS accounts_payable NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS prepaid_expenses NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS accumulated_depreciation NUMERIC DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.properties.outstanding_mortgage_balance IS 'Current remaining mortgage balance for balance sheet reporting';
COMMENT ON COLUMN public.properties.cash_reserves IS 'Cash reserves held specifically for this property';
COMMENT ON COLUMN public.properties.accounts_payable IS 'Outstanding amounts owed to vendors/contractors';
COMMENT ON COLUMN public.properties.prepaid_expenses IS 'Prepaid insurance, taxes, and other expenses';
COMMENT ON COLUMN public.properties.accumulated_depreciation IS 'Total depreciation taken on the property';