-- Add comprehensive financial fields to properties table for enhanced analytics
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC,
ADD COLUMN IF NOT EXISTS current_market_value NUMERIC,
ADD COLUMN IF NOT EXISTS purchase_date DATE,
ADD COLUMN IF NOT EXISTS down_payment_amount NUMERIC,
ADD COLUMN IF NOT EXISTS loan_amount NUMERIC,
ADD COLUMN IF NOT EXISTS interest_rate NUMERIC,
ADD COLUMN IF NOT EXISTS security_deposit_amount NUMERIC,
ADD COLUMN IF NOT EXISTS application_fee NUMERIC,
ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC,
ADD COLUMN IF NOT EXISTS pet_deposit NUMERIC,
ADD COLUMN IF NOT EXISTS pet_fee_monthly NUMERIC,
ADD COLUMN IF NOT EXISTS utility_water NUMERIC,
ADD COLUMN IF NOT EXISTS utility_electric NUMERIC,
ADD COLUMN IF NOT EXISTS utility_gas NUMERIC,
ADD COLUMN IF NOT EXISTS utility_trash NUMERIC,
ADD COLUMN IF NOT EXISTS landscaping_cost NUMERIC,
ADD COLUMN IF NOT EXISTS advertising_cost NUMERIC,
ADD COLUMN IF NOT EXISTS legal_professional_fees NUMERIC,
ADD COLUMN IF NOT EXISTS capital_improvements NUMERIC,
ADD COLUMN IF NOT EXISTS property_management_software NUMERIC,
ADD COLUMN IF NOT EXISTS turnover_costs NUMERIC,
ADD COLUMN IF NOT EXISTS tenant_screening_costs NUMERIC,
ADD COLUMN IF NOT EXISTS lease_renewal_rate NUMERIC,
ADD COLUMN IF NOT EXISTS average_rent_increase NUMERIC,
ADD COLUMN IF NOT EXISTS target_noi NUMERIC,
ADD COLUMN IF NOT EXISTS target_cap_rate NUMERIC,
ADD COLUMN IF NOT EXISTS expected_annual_appreciation NUMERIC,
ADD COLUMN IF NOT EXISTS reserve_fund_target NUMERIC,
ADD COLUMN IF NOT EXISTS other_income_sources NUMERIC,
ADD COLUMN IF NOT EXISTS other_income_description TEXT;

-- Add comments to explain the fields
COMMENT ON COLUMN public.properties.purchase_price IS 'Original purchase price of the property';
COMMENT ON COLUMN public.properties.current_market_value IS 'Current estimated market value';
COMMENT ON COLUMN public.properties.purchase_date IS 'Date when property was purchased';
COMMENT ON COLUMN public.properties.down_payment_amount IS 'Down payment amount for financing calculations';
COMMENT ON COLUMN public.properties.loan_amount IS 'Current loan balance';
COMMENT ON COLUMN public.properties.interest_rate IS 'Current interest rate percentage';
COMMENT ON COLUMN public.properties.security_deposit_amount IS 'Standard security deposit amount';
COMMENT ON COLUMN public.properties.application_fee IS 'Application fee charged to prospective tenants';
COMMENT ON COLUMN public.properties.late_fee_amount IS 'Late fee amount for rent payments';
COMMENT ON COLUMN public.properties.pet_deposit IS 'One-time pet deposit amount';
COMMENT ON COLUMN public.properties.pet_fee_monthly IS 'Monthly pet fee';
COMMENT ON COLUMN public.properties.utility_water IS 'Monthly water utility cost (if paid by landlord)';
COMMENT ON COLUMN public.properties.utility_electric IS 'Monthly electric utility cost (if paid by landlord)';
COMMENT ON COLUMN public.properties.utility_gas IS 'Monthly gas utility cost (if paid by landlord)';
COMMENT ON COLUMN public.properties.utility_trash IS 'Monthly trash utility cost (if paid by landlord)';
COMMENT ON COLUMN public.properties.landscaping_cost IS 'Monthly landscaping and grounds maintenance cost';
COMMENT ON COLUMN public.properties.advertising_cost IS 'Monthly advertising and marketing cost for vacancies';
COMMENT ON COLUMN public.properties.legal_professional_fees IS 'Monthly legal and professional service fees';
COMMENT ON COLUMN public.properties.capital_improvements IS 'Monthly reserve for capital improvements';
COMMENT ON COLUMN public.properties.property_management_software IS 'Monthly property management software costs';
COMMENT ON COLUMN public.properties.turnover_costs IS 'Average turnover costs between tenants';
COMMENT ON COLUMN public.properties.tenant_screening_costs IS 'Average tenant screening costs per application';
COMMENT ON COLUMN public.properties.lease_renewal_rate IS 'Historical lease renewal rate percentage';
COMMENT ON COLUMN public.properties.average_rent_increase IS 'Average annual rent increase percentage';
COMMENT ON COLUMN public.properties.target_noi IS 'Target Net Operating Income';
COMMENT ON COLUMN public.properties.target_cap_rate IS 'Target capitalization rate percentage';
COMMENT ON COLUMN public.properties.expected_annual_appreciation IS 'Expected annual property appreciation percentage';
COMMENT ON COLUMN public.properties.reserve_fund_target IS 'Target amount for property reserve fund';
COMMENT ON COLUMN public.properties.other_income_sources IS 'Monthly income from other sources (parking, storage, etc.)';
COMMENT ON COLUMN public.properties.other_income_description IS 'Description of other income sources';