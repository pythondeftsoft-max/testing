-- Add financial tracking fields to properties table for accounts receivable reporting
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_date DATE,
ADD COLUMN IF NOT EXISTS total_charges_mtd NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_payments_mtd NUMERIC DEFAULT 0;

-- Create sample rent payment data for existing properties
INSERT INTO public.rent_payments (
  property_id,
  tenant_id,
  amount,
  due_date,
  payment_date,
  payment_method,
  status,
  late_fee_amount,
  days_late,
  created_at
)
SELECT 
  p.id as property_id,
  (SELECT id FROM auth.users LIMIT 1) as tenant_id,
  p.monthly_rent,
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day' as due_date,
  CASE 
    WHEN random() > 0.3 THEN DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day' + (random() * 5)::integer * INTERVAL '1 day'
    ELSE NULL 
  END as payment_date,
  CASE 
    WHEN random() > 0.5 THEN 'bank_transfer'
    ELSE 'credit_card'
  END as payment_method,
  CASE 
    WHEN random() > 0.3 THEN 'completed'
    WHEN random() > 0.6 THEN 'pending'
    ELSE 'overdue'
  END as status,
  CASE 
    WHEN random() > 0.7 THEN 50.00
    ELSE 0
  END as late_fee_amount,
  CASE 
    WHEN random() > 0.7 THEN (random() * 10)::integer
    ELSE 0
  END as days_late,
  CURRENT_TIMESTAMP - (random() * 30)::integer * INTERVAL '1 day' as created_at
FROM public.properties p
WHERE p.monthly_rent IS NOT NULL
AND p.monthly_rent > 0
LIMIT 50;

-- Update properties with calculated outstanding balances
UPDATE public.properties 
SET 
  outstanding_balance = CASE 
    WHEN random() > 0.7 THEN monthly_rent * (0.5 + random())
    ELSE 0
  END,
  last_payment_amount = monthly_rent * (0.8 + random() * 0.4),
  last_payment_date = CURRENT_DATE - (random() * 45)::integer,
  total_charges_mtd = monthly_rent + (CASE WHEN random() > 0.8 THEN 50 ELSE 0 END),
  total_payments_mtd = CASE 
    WHEN random() > 0.3 THEN monthly_rent * (0.9 + random() * 0.2)
    ELSE monthly_rent * (0.5 + random() * 0.4)
  END
WHERE monthly_rent IS NOT NULL AND monthly_rent > 0;