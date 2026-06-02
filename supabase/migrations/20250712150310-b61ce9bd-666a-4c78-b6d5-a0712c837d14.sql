-- Add test HAP payments for the property "115 Monteith Cir"
INSERT INTO hap_payments (
  property_id,
  tenant_id,
  payment_date,
  actual_amount,
  expected_amount,
  payment_period_start,
  payment_period_end,
  payment_status,
  payment_method,
  is_verified,
  notes,
  created_at
) VALUES
  -- On-time HAP payment for December 2024
  (
    '9ed03125-82ab-4a2b-b05c-7302820fae87',
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    '2024-12-15',
    650.00,
    650.00,
    '2024-12-01',
    '2024-12-31',
    'received',
    'ach',
    true,
    'Monthly HAP payment received via ACH transfer',
    '2024-12-15 10:30:00'
  ),
  -- Late HAP payment for November 2024
  (
    '9ed03125-82ab-4a2b-b05c-7302820fae87',
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    '2024-11-08',
    650.00,
    650.00,
    '2024-11-01',
    '2024-11-30',
    'received',
    'ach',
    true,
    'HAP payment received 3 days late due to PHA processing delay',
    '2024-11-08 14:20:00'
  ),
  -- Pending HAP payment for January 2025
  (
    '9ed03125-82ab-4a2b-b05c-7302820fae87',
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    NULL,
    NULL,
    650.00,
    '2025-01-01',
    '2025-01-31',
    'expected',
    'ach',
    false,
    'Expected monthly HAP payment for January 2025',
    CURRENT_TIMESTAMP
  ),
  -- Historical HAP payment for October 2024
  (
    '9ed03125-82ab-4a2b-b05c-7302820fae87',
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    '2024-10-01',
    650.00,
    650.00,
    '2024-10-01',
    '2024-10-31',
    'received',
    'ach',
    true,
    'On-time HAP payment for October',
    '2024-10-01 09:15:00'
  );