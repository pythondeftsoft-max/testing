-- Create simple test data for overdue rent payments

-- Update existing rent payments to be overdue (keeping payment_date but setting due_date in the past)
UPDATE rent_payments 
SET 
  due_date = CASE 
    WHEN id = '81f30b65-bf76-43b9-8a0f-daffdc9e245c' THEN CURRENT_DATE - interval '15 days'  
    WHEN id = 'd9cc5f2e-50ba-44da-9fe1-bcedaea9d903' THEN CURRENT_DATE - interval '45 days'  
    WHEN id = 'bec279f3-17fd-4006-b072-b8148b219412' THEN CURRENT_DATE - interval '75 days'  
    WHEN id = '7b352eab-cba2-4776-8403-2190bf9618f9' THEN CURRENT_DATE - interval '120 days' 
    WHEN id = '0c6af1f8-c040-439b-92fd-0b1069fe6281' THEN CURRENT_DATE - interval '8 days'   
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
  status = 'overdue'
WHERE id IN (
  '81f30b65-bf76-43b9-8a0f-daffdc9e245c',
  'd9cc5f2e-50ba-44da-9fe1-bcedaea9d903', 
  'bec279f3-17fd-4006-b072-b8148b219412',
  '7b352eab-cba2-4776-8403-2190bf9618f9',
  '0c6af1f8-c040-439b-92fd-0b1069fe6281'
);