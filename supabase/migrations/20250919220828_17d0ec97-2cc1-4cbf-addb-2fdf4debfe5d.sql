-- Add sample delinquent tenant data (now that trigger is fixed)

-- Update existing rent payments to create overdue scenarios with various aging buckets
UPDATE rent_payments 
SET 
  due_date = CASE 
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1) THEN '2025-09-01'::date -- 18 days late
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 1) THEN '2025-08-15'::date -- 35 days late  
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 2) THEN '2025-07-15'::date -- 66 days late
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 3) THEN '2025-06-15'::date -- 96 days late
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 4) THEN '2025-08-05'::date -- 45 days late
    ELSE '2025-05-20'::date -- 120+ days late
  END,
  status = 'pending', -- Ensure payments are still pending
  late_fee_amount = CASE 
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1) THEN 25.00
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 1) THEN 50.00
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 2) THEN 75.00
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 3) THEN 100.00
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 4) THEN 60.00
    ELSE 150.00
  END,
  days_late = CASE 
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1) THEN 18
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 1) THEN 35
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 2) THEN 66
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 3) THEN 96
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 4) THEN 45
    ELSE 120
  END,
  amount = COALESCE(amount, 1500.00), -- Ensure amount is set
  updated_at = NOW()
WHERE id IN (SELECT id FROM rent_payments ORDER BY created_at LIMIT 6);