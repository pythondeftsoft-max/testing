-- Add test payment data for payment analytics demonstration
-- First, let's add some HAP payments for properties with rent splits
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
  -- Property with on-time HAP payment
  (
    (SELECT id FROM properties WHERE address LIKE '%Main Street%' LIMIT 1),
    NULL,
    600.00,
    600.00,
    CURRENT_DATE - INTERVAL '5 days',
    DATE_TRUNC('month', CURRENT_DATE),
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
    'received',
    true,
    CURRENT_DATE - INTERVAL '5 days',
    'HAP payment received on time'
  ),
  -- Property with late HAP payment
  (
    (SELECT id FROM properties WHERE address LIKE '%Oak Avenue%' LIMIT 1),
    NULL,
    900.00,
    900.00,
    CURRENT_DATE - INTERVAL '15 days',
    DATE_TRUNC('month', CURRENT_DATE),
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
    'received',
    true,
    CURRENT_DATE - INTERVAL '15 days',
    'HAP payment received late'
  ),
  -- Property with pending HAP payment
  (
    (SELECT id FROM properties WHERE address LIKE '%Community Way%' LIMIT 1),
    NULL,
    550.00,
    NULL,
    NULL,
    DATE_TRUNC('month', CURRENT_DATE),
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
    'expected',
    false,
    NULL,
    'HAP payment expected but not yet received'
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
  -- On-time tenant payment
  (
    (SELECT id FROM properties WHERE address LIKE '%Main Street%' LIMIT 1),
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    600.00,
    CURRENT_DATE - INTERVAL '3 days',
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day',
    'completed',
    0,
    0.00,
    'stripe'
  ),
  -- Late tenant payment
  (
    (SELECT id FROM properties WHERE address LIKE '%Oak Avenue%' LIMIT 1),
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    900.00,
    CURRENT_DATE - INTERVAL '10 days',
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day',
    'completed',
    8,
    25.00,
    'stripe'
  ),
  -- Overdue tenant payment (not paid yet)
  (
    (SELECT id FROM properties WHERE address LIKE '%Community Way%' LIMIT 1),
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    1000.00,
    NULL,
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day',
    'pending',
    CURRENT_DATE::date - (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day')::date,
    0.00,
    NULL
  ),
  -- Pending current month payment
  (
    (SELECT id FROM properties WHERE address LIKE '%Test Prop%' LIMIT 1),
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    1500.00,
    NULL,
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day',
    'pending',
    0,
    0.00,
    NULL
  );

-- Add some rent splits for properties that need HAP tracking
INSERT INTO rent_splits (property_id, tenant_id, pha_portion, tenant_portion, effective_date, is_active)
VALUES
  (
    (SELECT id FROM properties WHERE address LIKE '%Main Street%' LIMIT 1),
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    600.00,
    600.00,
    DATE_TRUNC('month', CURRENT_DATE),
    true
  ),
  (
    (SELECT id FROM properties WHERE address LIKE '%Oak Avenue%' LIMIT 1),
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    900.00,
    900.00,
    DATE_TRUNC('month', CURRENT_DATE),
    true
  ),
  (
    (SELECT id FROM properties WHERE address LIKE '%Community Way%' LIMIT 1),
    (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
    550.00,
    1000.00,
    DATE_TRUNC('month', CURRENT_DATE),
    true
  )
ON CONFLICT (property_id, tenant_id, effective_date) DO NOTHING;