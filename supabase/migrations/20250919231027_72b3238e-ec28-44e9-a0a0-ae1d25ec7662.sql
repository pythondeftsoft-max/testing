-- Update existing sample rent payment data to use real property IDs
-- First, let's update the rent payments to use actual user properties

UPDATE rent_payments 
SET property_id = '5a65574e-ffda-4034-917f-f402b2bd3430'  -- 123 Main Interest Street (ABC123 portfolio)
WHERE property_id IN (
  SELECT id FROM properties WHERE portfolio_id IS NULL AND address LIKE '%Delinquent%'
) AND amount = 1200.00;

UPDATE rent_payments 
SET property_id = '83bbf428-7634-4e6b-9022-48eaa5ad09be'  -- 127 Test est est (This is my own Portfolio)
WHERE property_id IN (
  SELECT id FROM properties WHERE portfolio_id IS NULL AND address LIKE '%Delinquent%'
) AND amount = 1500.00;

UPDATE rent_payments 
SET property_id = '25c0dcdc-458b-495f-99f4-9b2f24faa102'  -- 424 east olive street (Test Portfolio 1)
WHERE property_id IN (
  SELECT id FROM properties WHERE portfolio_id IS NULL AND address LIKE '%Delinquent%'
) AND amount = 1800.00;

-- Clean up the test properties that were created with NULL portfolio_id
DELETE FROM properties WHERE portfolio_id IS NULL AND address LIKE '%Delinquent%';

-- Add some additional sample delinquent rent payments for better testing
INSERT INTO rent_payments (
  property_id, 
  tenant_id, 
  amount, 
  due_date, 
  payment_date, 
  late_fee_amount, 
  days_late, 
  status
) VALUES 
-- Late payment for 123 Main Interest Street
('5a65574e-ffda-4034-917f-f402b2bd3430', 
 (SELECT id FROM profiles WHERE first_name = 'John' AND last_name = 'Smith' LIMIT 1), 
 1200.00, 
 CURRENT_DATE - INTERVAL '15 days', 
 NULL, 
 60.00, 
 15, 
 'overdue'),

-- Very late payment for 127 Test est est  
('83bbf428-7634-4e6b-9022-48eaa5ad09be',
 (SELECT id FROM profiles WHERE first_name = 'Jane' AND last_name = 'Doe' LIMIT 1),
 1500.00,
 CURRENT_DATE - INTERVAL '45 days',
 NULL,
 150.00,
 45,
 'overdue'),

-- Extremely late payment for 424 east olive street
('25c0dcdc-458b-495f-99f4-9b2f24faa102',
 (SELECT id FROM profiles WHERE first_name = 'Mike' AND last_name = 'Johnson' LIMIT 1),
 1800.00,
 CURRENT_DATE - INTERVAL '95 days',
 NULL,
 250.00,
 95,
 'overdue');