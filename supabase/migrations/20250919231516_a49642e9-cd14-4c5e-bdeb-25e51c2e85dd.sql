-- Create some simple overdue rent payments by updating existing records
-- PostgreSQL doesn't support LIMIT in UPDATE, so we'll use a different approach

UPDATE rent_payments 
SET 
  due_date = CURRENT_DATE - INTERVAL '30 days',
  days_late = 30,
  late_fee_amount = 60.00,
  status = 'pending'
WHERE id IN (
  SELECT id FROM rent_payments 
  WHERE property_id = '5a65574e-ffda-4034-917f-f402b2bd3430'
  AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1
);

-- If no completed payments exist, let's just create overdue payments with a simpler approach
-- by directly inserting without complex triggers
INSERT INTO rent_payments (
  property_id, 
  amount, 
  due_date, 
  payment_date, 
  late_fee_amount, 
  days_late, 
  status,
  payment_source,
  payment_type
) VALUES 
('5a65574e-ffda-4034-917f-f402b2bd3430', 1200.00, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '30 days', 60.00, 30, 'pending', 'tenant', 'rent'),
('83bbf428-7634-4e6b-9022-48eaa5ad09be', 1500.00, CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '60 days', 150.00, 60, 'pending', 'tenant', 'rent'),
('25c0dcdc-458b-495f-99f4-9b2f24faa102', 1800.00, CURRENT_DATE - INTERVAL '100 days', CURRENT_DATE - INTERVAL '100 days', 250.00, 100, 'pending', 'tenant', 'rent')
ON CONFLICT DO NOTHING;