-- Insert test data with proper UUIDs

-- Insert test tenant profiles if they don't exist
INSERT INTO profiles (id, first_name, last_name, user_type) 
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'John', 'Smith', 'tenant'),
  ('22222222-2222-2222-2222-222222222222', 'Sarah', 'Johnson', 'tenant'),
  ('33333333-3333-3333-3333-333333333333', 'Mike', 'Davis', 'tenant')
ON CONFLICT (id) DO NOTHING;

-- Insert tenant profiles for the test tenants
INSERT INTO tenant_profiles (user_id, monthly_income, credit_score, voucher_holder, voucher_amount)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 3500.00, 720, true, 1200.00),
  ('22222222-2222-2222-2222-222222222222', 4200.00, 680, false, NULL),
  ('33333333-3333-3333-3333-333333333333', 3800.00, 740, true, 1400.00)
ON CONFLICT (user_id) DO NOTHING;

-- Insert test property applications
INSERT INTO property_applications (tenant_id, property_id, status, priority_payment_made, priority_payment_amount, tenant_score)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  id,
  'pending',
  true,
  15.00,
  8
FROM properties 
WHERE owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede' 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO property_applications (tenant_id, property_id, status, priority_payment_made, priority_payment_amount, tenant_score)
SELECT 
  '22222222-2222-2222-2222-222222222222',
  id,
  'pending',
  false,
  15.00,
  7
FROM properties 
WHERE owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede' 
OFFSET 1
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO property_applications (tenant_id, property_id, status, priority_payment_made, priority_payment_amount, tenant_score)
SELECT 
  '33333333-3333-3333-3333-333333333333',
  id,
  'approved',
  true,
  15.00,
  9
FROM properties 
WHERE owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede' 
OFFSET 2
LIMIT 1
ON CONFLICT DO NOTHING;