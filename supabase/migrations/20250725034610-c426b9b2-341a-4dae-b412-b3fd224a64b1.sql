-- Add comprehensive financial fields to properties table for detailed reporting

-- Income & Revenue Fields
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS other_income numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS utility_reimbursements numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS late_fee_income numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS pet_deposit numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS pet_monthly_fee numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS parking_fee numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS storage_fee numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS laundry_income numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS vending_income numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS amenity_fees numeric DEFAULT 0;

-- Operating Expenses
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS water_cost numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS electric_cost numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS gas_cost numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS trash_cost numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS sewer_cost numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS landscaping_cost numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS cleaning_cost numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS legal_fees numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS accounting_fees numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS marketing_cost numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS office_expenses numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS software_cost numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS maintenance_supplies numeric DEFAULT 0;

-- Capital & Financing
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS purchase_price numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS down_payment numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS loan_amount numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS interest_rate numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS loan_term_years integer;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS closing_costs numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS capital_improvements numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS equipment_purchases numeric DEFAULT 0;

-- Tax & Accounting
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS annual_depreciation numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS depreciation_method text DEFAULT 'straight_line';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS hoa_fees numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS special_assessments numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS improvement_costs numeric DEFAULT 0;

-- Performance & Analysis
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS vacancy_allowance_percent numeric DEFAULT 5.0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS target_cap_rate numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS target_cash_on_cash numeric;

-- Financing Details
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS loan_type text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lender_name text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS loan_start_date date;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS estimated_monthly_payment numeric;

-- Additional Income Sources
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS security_deposit_amount numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS first_month_rent numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS last_month_rent numeric DEFAULT 0;

-- Create indexes for performance on frequently queried financial fields
CREATE INDEX IF NOT EXISTS idx_properties_purchase_price ON public.properties(purchase_price);
CREATE INDEX IF NOT EXISTS idx_properties_monthly_rent ON public.properties(monthly_rent);
CREATE INDEX IF NOT EXISTS idx_properties_loan_amount ON public.properties(loan_amount);

-- Add comments for field documentation
COMMENT ON COLUMN public.properties.other_income IS 'Monthly other income (parking, laundry, etc.)';
COMMENT ON COLUMN public.properties.utility_reimbursements IS 'Monthly utility reimbursements from tenants';
COMMENT ON COLUMN public.properties.vacancy_allowance_percent IS 'Vacancy allowance as percentage (default 5%)';
COMMENT ON COLUMN public.properties.annual_depreciation IS 'Annual depreciation amount for tax purposes';
COMMENT ON COLUMN public.properties.capital_improvements IS 'Total capital improvements made to property';
COMMENT ON COLUMN public.properties.target_cap_rate IS 'Target capitalization rate for investment analysis';