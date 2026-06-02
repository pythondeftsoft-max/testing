-- Add comprehensive financial fields to property_units table to support unit-level financial tracking

-- Income & Revenue fields
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS security_deposit_amount numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS application_fee numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS late_fee_amount numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS pet_fee_monthly numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS parking_income numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS storage_income numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS laundry_income numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS other_income_sources numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS other_income_description text;

-- Operating Expenses fields
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS monthly_insurance numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS monthly_mortgage numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS property_taxes numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS monthly_management_fee numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS monthly_repairs numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS hoa_fees numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS utility_water numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS utility_electric numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS utility_gas numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS utility_trash numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS landscaping_cost numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS advertising_cost numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS legal_professional_fees numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS property_management_software numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS capital_improvements numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS turnover_costs numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS tenant_screening_costs numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS accounting_fees numeric DEFAULT 0;

-- Capital & Financing fields
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS purchase_price numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS current_market_value numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS purchase_date date;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS down_payment_amount numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS loan_amount numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS interest_rate numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS loan_term integer DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS closing_costs numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS renovation_costs numeric DEFAULT 0;

-- Tax & Accounting fields
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS annual_property_tax numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS depreciation_method text;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS depreciation_period integer;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS tax_deductions text;

-- Performance Metrics & Analysis fields
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS lease_renewal_rate numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS average_rent_increase numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS target_noi numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS target_cap_rate numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS expected_annual_appreciation numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS reserve_fund_target numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS vacancy_rate numeric DEFAULT 0;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS occupancy_rate numeric DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.property_units.security_deposit_amount IS 'Security deposit amount for this unit';
COMMENT ON COLUMN public.property_units.monthly_insurance IS 'Monthly insurance cost allocated to this unit';
COMMENT ON COLUMN public.property_units.purchase_price IS 'Purchase price allocated to this unit (for multi-unit properties)';
COMMENT ON COLUMN public.property_units.lease_renewal_rate IS 'Historical lease renewal rate for this unit as a percentage';
COMMENT ON COLUMN public.property_units.target_cap_rate IS 'Target capitalization rate for this unit as a percentage';