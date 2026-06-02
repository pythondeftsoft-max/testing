-- Temporarily disable the trigger that's causing issues
ALTER TABLE rent_payments DISABLE TRIGGER notify_rent_payment_trigger;

-- Insert the overdue payments without triggering notifications
INSERT INTO rent_payments (
  property_id, 
  tenant_id,
  amount, 
  due_date, 
  payment_date, 
  late_fee_amount, 
  days_late, 
  status,
  payment_source,
  payment_type
) VALUES 
('5a65574e-ffda-4034-917f-f402b2bd3430', 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1), 
 1200.00, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '30 days', 60.00, 30, 'pending', 'tenant', 'rent'),
('83bbf428-7634-4e6b-9022-48eaa5ad09be', 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1), 
 1500.00, CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '60 days', 150.00, 60, 'pending', 'tenant', 'rent'),
('25c0dcdc-458b-495f-99f4-9b2f24faa102', 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1), 
 1800.00, CURRENT_DATE - INTERVAL '100 days', CURRENT_DATE - INTERVAL '100 days', 250.00, 100, 'pending', 'tenant', 'rent');

-- Re-enable the trigger
ALTER TABLE rent_payments ENABLE TRIGGER notify_rent_payment_trigger;