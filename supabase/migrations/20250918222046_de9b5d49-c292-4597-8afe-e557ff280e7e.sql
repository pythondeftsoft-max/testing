-- Create realistic overdue rent payment test data using existing properties and tenants

-- Update some existing rent payments to have due dates and be overdue
UPDATE rent_payments 
SET 
  due_date = CASE 
    WHEN id = '81f30b65-bf76-43b9-8a0f-daffdc9e245c' THEN CURRENT_DATE - interval '15 days'  -- 15 days late
    WHEN id = 'd9cc5f2e-50ba-44da-9fe1-bcedaea9d903' THEN CURRENT_DATE - interval '45 days'  -- 45 days late
    WHEN id = 'bec279f3-17fd-4006-b072-b8148b219412' THEN CURRENT_DATE - interval '75 days'  -- 75 days late
    WHEN id = '7b352eab-cba2-4776-8403-2190bf9618f9' THEN CURRENT_DATE - interval '120 days' -- 120 days late
    WHEN id = '0c6af1f8-c040-439b-92fd-0b1069fe6281' THEN CURRENT_DATE - interval '8 days'   -- 8 days late
    ELSE due_date
  END,
  days_late = CASE 
    WHEN id = '81f30b65-bf76-43b9-8a0f-daffdc9e245c' THEN 15
    WHEN id = 'd9cc5f2e-50ba-44da-9fe1-bcedaea9d903' THEN 45
    WHEN id = 'bec279f3-17fd-4006-b072-b8148b219412' THEN 75
    WHEN id = '7b352eab-cba2-4776-8403-2190bf9618f9' THEN 120
    WHEN id = '0c6af1f8-c040-439b-92fd-0b1069fe6281' THEN 8
    ELSE days_late
  END,
  late_fee_amount = CASE 
    WHEN id = '81f30b65-bf76-43b9-8a0f-daffdc9e245c' THEN 50.00
    WHEN id = 'd9cc5f2e-50ba-44da-9fe1-bcedaea9d903' THEN 75.00
    WHEN id = 'bec279f3-17fd-4006-b072-b8148b219412' THEN 100.00
    WHEN id = '7b352eab-cba2-4776-8403-2190bf9618f9' THEN 150.00
    WHEN id = '0c6af1f8-c040-439b-92fd-0b1069fe6281' THEN 25.00
    ELSE late_fee_amount
  END,
  payment_date = NULL,  -- No payment made yet
  status = 'overdue'
WHERE id IN (
  '81f30b65-bf76-43b9-8a0f-daffdc9e245c',
  'd9cc5f2e-50ba-44da-9fe1-bcedaea9d903', 
  'bec279f3-17fd-4006-b072-b8148b219412',
  '7b352eab-cba2-4776-8403-2190bf9618f9',
  '0c6af1f8-c040-439b-92fd-0b1069fe6281'
);

-- Create additional overdue payments for different properties to show variety
INSERT INTO rent_payments (
  property_id, tenant_id, amount, due_date, status, days_late, late_fee_amount, payment_date
)
SELECT 
  p.id as property_id,
  (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1) as tenant_id,
  p.monthly_rent,
  CASE 
    WHEN row_number() OVER () = 1 THEN CURRENT_DATE - interval '25 days'
    WHEN row_number() OVER () = 2 THEN CURRENT_DATE - interval '55 days'  
    WHEN row_number() OVER () = 3 THEN CURRENT_DATE - interval '85 days'
    ELSE CURRENT_DATE - interval '30 days'
  END as due_date,
  'overdue' as status,
  CASE 
    WHEN row_number() OVER () = 1 THEN 25
    WHEN row_number() OVER () = 2 THEN 55
    WHEN row_number() OVER () = 3 THEN 85
    ELSE 30
  END as days_late,
  CASE 
    WHEN row_number() OVER () = 1 THEN 60.00
    WHEN row_number() OVER () = 2 THEN 90.00
    WHEN row_number() OVER () = 3 THEN 120.00
    ELSE 70.00
  END as late_fee_amount,
  NULL as payment_date
FROM properties p
WHERE p.id != 'd7ffde0c-da9a-4563-9bde-e9a7fc87f3e3'  -- Don't duplicate existing property
  AND p.deleted_at IS NULL
LIMIT 3
ON CONFLICT DO NOTHING;