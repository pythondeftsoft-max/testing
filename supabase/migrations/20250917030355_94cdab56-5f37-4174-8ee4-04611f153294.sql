-- Add missing financial fields for comprehensive trial balance tracking
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS accounts_receivable NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS security_deposits_receivable NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS prepaid_expenses NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS beginning_cash_balance NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS ending_cash_balance NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS security_deposits_held NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS accounts_payable NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS accrued_expenses NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_taxes NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS utilities_expense NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS maintenance_reserves NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_management_fees NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS advertising_expense NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS legal_professional_fees NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS other_operating_expenses NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS pet_fee_income NUMERIC DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS other_income NUMERIC DEFAULT 0;

-- Update existing data to populate realistic financial values for demonstration
UPDATE public.properties 
SET 
  monthly_rent = CASE WHEN monthly_rent IS NULL OR monthly_rent = 0 THEN 1200 + (RANDOM() * 800)::NUMERIC ELSE monthly_rent END,
  insurance_cost = CASE WHEN insurance_cost IS NULL OR insurance_cost = 0 THEN 80 + (RANDOM() * 40)::NUMERIC ELSE insurance_cost END,
  mortgage_cost = CASE WHEN mortgage_cost IS NULL OR mortgage_cost = 0 THEN 600 + (RANDOM() * 400)::NUMERIC ELSE mortgage_cost END,
  management_fee = CASE WHEN management_fee IS NULL OR management_fee = 0 THEN (monthly_rent * 0.08)::NUMERIC ELSE management_fee END,
  repair_costs = CASE WHEN repair_costs IS NULL OR repair_costs = 0 THEN 50 + (RANDOM() * 100)::NUMERIC ELSE repair_costs END,
  property_taxes = CASE WHEN property_taxes IS NULL OR property_taxes = 0 THEN 200 + (RANDOM() * 150)::NUMERIC ELSE property_taxes END,
  utilities_expense = CASE WHEN utilities_expense IS NULL OR utilities_expense = 0 THEN 30 + (RANDOM() * 70)::NUMERIC ELSE utilities_expense END,
  depreciation_expense = CASE WHEN depreciation_expense IS NULL OR depreciation_expense = 0 THEN 150 + (RANDOM() * 100)::NUMERIC ELSE depreciation_expense END,
  advertising_expense = CASE WHEN advertising_expense IS NULL OR advertising_expense = 0 THEN 25 + (RANDOM() * 50)::NUMERIC ELSE advertising_expense END,
  legal_professional_fees = CASE WHEN legal_professional_fees IS NULL OR legal_professional_fees = 0 THEN 40 + (RANDOM() * 60)::NUMERIC ELSE legal_professional_fees END,
  late_fee_income = CASE WHEN late_fee_income IS NULL OR late_fee_income = 0 THEN 15 + (RANDOM() * 35)::NUMERIC ELSE late_fee_income END,
  pet_fee_income = CASE WHEN pet_fee_income IS NULL OR pet_fee_income = 0 THEN 20 + (RANDOM() * 30)::NUMERIC ELSE pet_fee_income END,
  application_fee_income = CASE WHEN application_fee_income IS NULL OR application_fee_income = 0 THEN 10 + (RANDOM() * 15)::NUMERIC ELSE application_fee_income END,
  other_income = CASE WHEN other_income IS NULL OR other_income = 0 THEN 25 + (RANDOM() * 50)::NUMERIC ELSE other_income END,
  beginning_cash_balance = CASE WHEN beginning_cash_balance IS NULL OR beginning_cash_balance = 0 THEN 1000 + (RANDOM() * 2000)::NUMERIC ELSE beginning_cash_balance END,
  ending_cash_balance = CASE WHEN ending_cash_balance IS NULL OR ending_cash_balance = 0 THEN beginning_cash_balance + 500 + (RANDOM() * 1000)::NUMERIC ELSE ending_cash_balance END,
  accounts_receivable = CASE WHEN accounts_receivable IS NULL OR accounts_receivable = 0 THEN (RANDOM() * 500)::NUMERIC ELSE accounts_receivable END,
  security_deposits_held = CASE WHEN security_deposits_held IS NULL OR security_deposits_held = 0 THEN (monthly_rent * 1.5)::NUMERIC ELSE security_deposits_held END,
  accounts_payable = CASE WHEN accounts_payable IS NULL OR accounts_payable = 0 THEN (RANDOM() * 300)::NUMERIC ELSE accounts_payable END,
  accrued_expenses = CASE WHEN accrued_expenses IS NULL OR accrued_expenses = 0 THEN (RANDOM() * 200)::NUMERIC ELSE accrued_expenses END
WHERE deleted_at IS NULL AND status IN ('available', 'occupied', 'vacant');

-- Add some sample rent payments to demonstrate income tracking
INSERT INTO public.rent_payments (
  property_id,
  tenant_id,
  amount,
  due_date,
  payment_date,
  status,
  days_late,
  late_fee_amount
)
SELECT 
  p.id,
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY RANDOM() LIMIT 1),
  p.monthly_rent,
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day',
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '3 days',
  'completed',
  2,
  CASE WHEN RANDOM() > 0.7 THEN 25 + (RANDOM() * 50)::NUMERIC ELSE 0 END
FROM properties p
WHERE p.deleted_at IS NULL 
  AND p.status IN ('occupied')
  AND p.monthly_rent > 0
  AND NOT EXISTS (
    SELECT 1 FROM rent_payments rp 
    WHERE rp.property_id = p.id 
    AND DATE_TRUNC('month', rp.due_date) = DATE_TRUNC('month', CURRENT_DATE)
  )
LIMIT 20;