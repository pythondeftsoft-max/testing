-- Fix payment data and set up proper rent splits for existing tenant

-- First, let's create a rent split for the property (assuming no voucher, full tenant payment)
INSERT INTO rent_splits (
  property_id,
  tenant_id,
  total_rent,
  pha_portion,
  tenant_portion,
  effective_date,
  pha_id,
  hap_payment_day,
  tenant_payment_day,
  is_active,
  voucher_type
) 
SELECT 
  p.id,
  pa.tenant_id,
  p.monthly_rent,
  0, -- No PHA portion for regular tenant
  p.monthly_rent, -- Full tenant payment
  CURRENT_DATE,
  NULL, -- No PHA
  1, -- 1st of month
  p.rent_due_day,
  true,
  'none' -- No voucher
FROM properties p
JOIN property_applications pa ON p.id = pa.property_id 
WHERE p.id = '07ea6c9b-9aa4-4b06-b08e-e6c5e3e0f1c5'
  AND pa.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM rent_splits rs 
    WHERE rs.property_id = p.id AND rs.is_active = true
  );

-- Create the first rent payment due for next month
INSERT INTO rent_payments (
  property_id,
  tenant_id,
  amount,
  due_date,
  payment_type,
  payment_source,
  status,
  original_rent_amount
)
SELECT 
  p.id,
  pa.tenant_id,
  p.monthly_rent,
  -- Next due date based on rent_due_day
  CASE 
    WHEN EXTRACT(DAY FROM CURRENT_DATE) < p.rent_due_day 
    THEN DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day' * (p.rent_due_day - 1)
    ELSE DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') + INTERVAL '1 day' * (p.rent_due_day - 1)
  END,
  'tenant',
  'tenant',
  'pending',
  p.monthly_rent
FROM properties p
JOIN property_applications pa ON p.id = pa.property_id
WHERE p.id = '07ea6c9b-9aa4-4b06-b08e-e6c5e3e0f1c5'
  AND pa.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM rent_payments rp 
    WHERE rp.property_id = p.id 
    AND rp.tenant_id = pa.tenant_id
    AND rp.status = 'pending'
    AND rp.due_date >= CURRENT_DATE
  );