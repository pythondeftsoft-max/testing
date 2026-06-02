-- Check what triggers exist on rent_payments table
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'rent_payments';

-- Let's try a simpler approach - just insert the minimal data needed
-- Insert overdue payments using existing tenant IDs from profiles
INSERT INTO rent_payments (
  property_id, 
  tenant_id,
  amount, 
  due_date, 
  payment_date, 
  status,
  payment_source,
  payment_type
) 
SELECT 
  '5a65574e-ffda-4034-917f-f402b2bd3430',
  p.id,
  1200.00,
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE - INTERVAL '30 days',
  'pending',
  'tenant',
  'rent'
FROM profiles p 
WHERE p.user_type = 'tenant' 
LIMIT 1;

INSERT INTO rent_payments (
  property_id, 
  tenant_id,
  amount, 
  due_date, 
  payment_date, 
  status,
  payment_source,
  payment_type
) 
SELECT 
  '83bbf428-7634-4e6b-9022-48eaa5ad09be',
  p.id,
  1500.00,
  CURRENT_DATE - INTERVAL '60 days',
  CURRENT_DATE - INTERVAL '60 days',
  'pending',
  'tenant',
  'rent'
FROM profiles p 
WHERE p.user_type = 'tenant' 
LIMIT 1;