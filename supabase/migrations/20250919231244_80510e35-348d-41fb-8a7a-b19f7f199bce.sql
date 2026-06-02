-- Add some sample delinquent rent payments with all required fields and valid status
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
-- Late payment for 123 Main Interest Street
('5a65574e-ffda-4034-917f-f402b2bd3430', 
 (SELECT id FROM profiles WHERE first_name = 'John' AND last_name = 'Smith' LIMIT 1), 
 1200.00, 
 CURRENT_DATE - INTERVAL '15 days', 
 CURRENT_DATE - INTERVAL '15 days',  
 60.00, 
 15, 
 'pending',
 'tenant',
 'rent'),

-- Very late payment for 127 Test est est  
('83bbf428-7634-4e6b-9022-48eaa5ad09be',
 (SELECT id FROM profiles WHERE first_name = 'Jane' AND last_name = 'Doe' LIMIT 1),
 1500.00,
 CURRENT_DATE - INTERVAL '45 days',
 CURRENT_DATE - INTERVAL '45 days',  
 150.00,
 45,
 'pending',
 'tenant',
 'rent'),

-- Extremely late payment for 424 east olive street
('25c0dcdc-458b-495f-99f4-9b2f24faa102',
 (SELECT id FROM profiles WHERE first_name = 'Mike' AND last_name = 'Johnson' LIMIT 1),
 1800.00,
 CURRENT_DATE - INTERVAL '95 days',
 CURRENT_DATE - INTERVAL '95 days',  
 250.00,
 95,
 'pending',
 'tenant',
 'rent');