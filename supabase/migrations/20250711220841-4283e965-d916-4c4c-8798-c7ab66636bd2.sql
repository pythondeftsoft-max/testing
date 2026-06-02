-- Add test payment data for payment analytics demonstration
-- Clean up any existing test data first
DELETE FROM hap_payments WHERE notes LIKE '%test%' OR notes LIKE '%demonstration%';
DELETE FROM rent_payments WHERE property_id IN (
  SELECT id FROM properties WHERE address IN ('123 Oak Street, Chicago, IL 60601', '567 Community Way, Cicero, IL 60804', '187 Test Prop, Brooklyn, NY 11208', '115 Monteith Cir, Saint Louis, MO 63137')
);

-- Add HAP payments for properties with existing rent splits
INSERT INTO hap_payments (
  property_id, 
  tenant_id,
  expected_amount, 
  actual_amount, 
  payment_date, 
  payment_period_start, 
  payment_period_end,
  payment_status,
  is_verified,
  verified_at,
  notes
) VALUES 
  -- Property with on-time HAP payment (115 Monteith Cir)
  (
    '9ed03125-82ab-4a2b-b05c-7302820fae87',
    NULL,
    900.00,
    900.00,
    CURRENT_DATE - INTERVAL '5 days',
    DATE_TRUNC('month', CURRENT_DATE),
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
    'received',
    true,
    CURRENT_DATE - INTERVAL '5 days',
    'HAP payment received on time - test data'
  ),
  -- Property with late HAP payment (456 Elm Street)
  (
    'a48a5813-f0fb-4aec-b251-af212c94c32f',
    NULL,
    950.00,
    950.00,
    CURRENT_DATE - INTERVAL '15 days',
    DATE_TRUNC('month', CURRENT_DATE),
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
    'received',
    true,
    CURRENT_DATE - INTERVAL '15 days',
    'HAP payment received late - test data'
  );

-- Add test rent payments for tenant portions
INSERT INTO rent_payments (
  property_id,
  tenant_id,
  amount,
  payment_date,
  due_date,
  status,
  days_late,
  late_fee_amount,
  payment_method
) VALUES
  -- On-time tenant payment (115 Monteith Cir)
  (
    '9ed03125-82ab-4a2b-b05c-7302820fae87',
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    500.00,
    CURRENT_DATE - INTERVAL '3 days',
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day',
    'completed',
    0,
    0.00,
    'stripe'
  ),
  -- Late tenant payment (456 Elm Street)
  (
    'a48a5813-f0fb-4aec-b251-af212c94c32f',
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    400.00,
    CURRENT_DATE - INTERVAL '10 days',
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day',
    'completed',
    8,
    25.00,
    'stripe'
  ),
  -- Overdue tenant payment (567 Community Way)
  (
    '42e5d1ed-d300-4f3b-b604-11137fd2ea25',
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    1200.00,
    NULL,
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day',
    'pending',
    GREATEST(0, CURRENT_DATE::date - (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day')::date),
    0.00,
    NULL
  ),
  -- Pending current month payment (187 Test Prop)
  (
    '640bec63-5c99-4b49-9eb3-ec14828999dc',
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    1500.00,
    NULL,
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day',
    'pending',
    0,
    0.00,
    NULL
  );