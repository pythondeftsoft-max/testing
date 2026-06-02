-- First, let's add some test data for property applications and messages

-- Insert test tenant profiles if they don't exist
INSERT INTO profiles (id, first_name, last_name, user_type) 
VALUES 
  ('test-tenant-1', 'John', 'Smith', 'tenant'),
  ('test-tenant-2', 'Sarah', 'Johnson', 'tenant'),
  ('test-tenant-3', 'Mike', 'Davis', 'tenant')
ON CONFLICT (id) DO NOTHING;

-- Insert tenant profiles for the test tenants
INSERT INTO tenant_profiles (user_id, monthly_income, credit_score, voucher_holder, voucher_amount)
VALUES 
  ('test-tenant-1', 3500.00, 720, true, 1200.00),
  ('test-tenant-2', 4200.00, 680, false, NULL),
  ('test-tenant-3', 3800.00, 740, true, 1400.00)
ON CONFLICT (user_id) DO NOTHING;

-- Insert test property applications using the correct foreign key relationship
INSERT INTO property_applications (tenant_id, property_id, status, priority_payment_made, priority_payment_amount, tenant_score)
SELECT 
  t.tenant_id,
  p.id as property_id,
  t.status,
  t.priority_payment_made,
  t.priority_payment_amount,
  t.tenant_score
FROM (VALUES 
  ('test-tenant-1', 'pending', true, 15.00, 8),
  ('test-tenant-2', 'pending', false, 15.00, 7),
  ('test-tenant-3', 'approved', true, 15.00, 9)
) AS t(tenant_id, status, priority_payment_made, priority_payment_amount, tenant_score)
CROSS JOIN (
  SELECT id FROM properties 
  WHERE owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede' 
  LIMIT 3
) AS p
ON CONFLICT DO NOTHING;

-- Insert test messages for the applications
WITH app_data AS (
  SELECT 
    pa.id as application_id,
    pa.tenant_id,
    p.owner_id as landlord_id
  FROM property_applications pa
  JOIN properties p ON p.id = pa.property_id
  WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
  LIMIT 3
)
INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant, created_at)
SELECT 
  app_data.application_id,
  app_data.tenant_id,
  'Hi! I am very interested in this property. Could we schedule a viewing?',
  true,
  now() - interval '2 days'
FROM app_data
UNION ALL
SELECT 
  app_data.application_id,
  app_data.landlord_id,
  'Thank you for your interest! I would be happy to schedule a viewing. What times work best for you?',
  false,
  now() - interval '1 day'
FROM app_data
UNION ALL
SELECT 
  app_data.application_id,
  app_data.tenant_id,
  'I am available this weekend or next week evenings. Please let me know what works.',
  true,
  now() - interval '12 hours'
FROM app_data
ON CONFLICT DO NOTHING;