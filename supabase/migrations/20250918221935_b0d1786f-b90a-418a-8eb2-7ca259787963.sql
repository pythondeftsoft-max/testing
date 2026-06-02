-- Add realistic test data for delinquent tenants report

-- First, let's create some tenant profiles
INSERT INTO profiles (id, first_name, last_name, email, phone, user_type, created_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'John', 'Smith', 'john.smith@email.com', '555-0101', 'tenant', now()),
  ('22222222-2222-2222-2222-222222222222', 'Sarah', 'Johnson', 'sarah.johnson@email.com', '555-0102', 'tenant', now()),
  ('33333333-3333-3333-3333-333333333333', 'Mike', 'Davis', 'mike.davis@email.com', '555-0103', 'tenant', now()),
  ('44444444-4444-4444-4444-444444444444', 'Lisa', 'Wilson', 'lisa.wilson@email.com', '555-0104', 'tenant', now()),
  ('55555555-5555-5555-5555-555555555555', 'Robert', 'Brown', 'robert.brown@email.com', '555-0105', 'tenant', now())
ON CONFLICT (id) DO NOTHING;

-- Get the first property to use for test data
WITH first_property AS (
  SELECT id, owner_id FROM properties LIMIT 1
),
-- Create property applications for approved tenants
test_applications AS (
  INSERT INTO property_applications (
    property_id, tenant_id, status, created_at, updated_at
  )
  SELECT 
    fp.id,
    unnest(ARRAY[
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222', 
      '33333333-3333-3333-3333-333333333333',
      '44444444-4444-4444-4444-444444444444',
      '55555555-5555-5555-5555-555555555555'
    ]::uuid[]),
    'approved',
    now() - interval '3 months',
    now() - interval '3 months'
  FROM first_property fp
  ON CONFLICT DO NOTHING
  RETURNING property_id, tenant_id
)
-- Create overdue rent payments with various aging scenarios
INSERT INTO rent_payments (
  property_id, tenant_id, amount, due_date, status, days_late, late_fee_amount, created_at
)
SELECT 
  ta.property_id,
  ta.tenant_id,
  CASE 
    WHEN ta.tenant_id = '11111111-1111-1111-1111-111111111111' THEN 1200.00  -- 15 days late
    WHEN ta.tenant_id = '22222222-2222-2222-2222-222222222222' THEN 950.00   -- 45 days late  
    WHEN ta.tenant_id = '33333333-3333-3333-3333-333333333333' THEN 1100.00  -- 75 days late
    WHEN ta.tenant_id = '44444444-4444-4444-4444-444444444444' THEN 850.00   -- 120 days late
    WHEN ta.tenant_id = '55555555-5555-5555-5555-555555555555' THEN 1300.00  -- 8 days late
  END,
  CASE 
    WHEN ta.tenant_id = '11111111-1111-1111-1111-111111111111' THEN CURRENT_DATE - interval '15 days'  -- 15 days late
    WHEN ta.tenant_id = '22222222-2222-2222-2222-222222222222' THEN CURRENT_DATE - interval '45 days'  -- 45 days late  
    WHEN ta.tenant_id = '33333333-3333-3333-3333-333333333333' THEN CURRENT_DATE - interval '75 days'  -- 75 days late
    WHEN ta.tenant_id = '44444444-4444-4444-4444-444444444444' THEN CURRENT_DATE - interval '120 days' -- 120 days late
    WHEN ta.tenant_id = '55555555-5555-5555-5555-555555555555' THEN CURRENT_DATE - interval '8 days'   -- 8 days late
  END,
  'pending',
  CASE 
    WHEN ta.tenant_id = '11111111-1111-1111-1111-111111111111' THEN 15   -- 15 days late
    WHEN ta.tenant_id = '22222222-2222-2222-2222-222222222222' THEN 45   -- 45 days late  
    WHEN ta.tenant_id = '33333333-3333-3333-3333-333333333333' THEN 75   -- 75 days late
    WHEN ta.tenant_id = '44444444-4444-4444-4444-444444444444' THEN 120  -- 120 days late
    WHEN ta.tenant_id = '55555555-5555-5555-5555-555555555555' THEN 8    -- 8 days late
  END,
  CASE 
    WHEN ta.tenant_id = '11111111-1111-1111-1111-111111111111' THEN 50.00   -- Late fee
    WHEN ta.tenant_id = '22222222-2222-2222-2222-222222222222' THEN 75.00   -- Late fee  
    WHEN ta.tenant_id = '33333333-3333-3333-3333-333333333333' THEN 100.00  -- Late fee
    WHEN ta.tenant_id = '44444444-4444-4444-4444-444444444444' THEN 150.00  -- Late fee
    WHEN ta.tenant_id = '55555555-5555-5555-5555-555555555555' THEN 25.00   -- Late fee
  END,
  now() - interval '1 month'
FROM test_applications ta
ON CONFLICT DO NOTHING;