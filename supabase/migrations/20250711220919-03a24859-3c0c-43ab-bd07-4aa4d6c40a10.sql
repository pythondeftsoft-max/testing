-- Add test payment data with all required fields
INSERT INTO rent_payments (
  property_id,
  tenant_id,
  payment_date,
  amount,
  payment_source,
  payment_type,
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
    CURRENT_DATE - INTERVAL '3 days',
    500.00,
    'tenant',
    'rent',
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
    CURRENT_DATE - INTERVAL '10 days',
    400.00,
    'tenant',
    'rent',
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day',
    'completed',
    8,
    25.00,
    'stripe'
  ),
  -- Overdue tenant payment (567 Community Way) - still pending
  (
    '42e5d1ed-d300-4f3b-b604-11137fd2ea25',
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    CURRENT_DATE + INTERVAL '5 days', -- Future date since it's pending
    1200.00,
    'tenant',
    'rent',
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day',
    'pending',
    GREATEST(0, CURRENT_DATE::date - (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day')::date),
    0.00,
    'stripe'
  ),
  -- Pending current month payment (187 Test Prop)
  (
    '640bec63-5c99-4b49-9eb3-ec14828999dc',
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    CURRENT_DATE + INTERVAL '10 days', -- Future date since it's pending
    1500.00,
    'tenant',
    'rent',
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day',
    'pending',
    0,
    0.00,
    'stripe'
  );