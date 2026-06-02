-- Add financial tracking fields to properties table for accounts receivable reporting
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_date DATE,
ADD COLUMN IF NOT EXISTS total_charges_mtd NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_payments_mtd NUMERIC DEFAULT 0;

-- Update properties with calculated outstanding balances based on existing rent data
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