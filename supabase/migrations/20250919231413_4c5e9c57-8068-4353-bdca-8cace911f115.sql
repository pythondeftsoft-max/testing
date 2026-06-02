-- Instead of inserting new records, let's update existing rent payments to be overdue
-- First, find some existing rent payments and make them overdue

UPDATE rent_payments 
SET 
  due_date = CURRENT_DATE - INTERVAL '30 days',
  days_late = 30,
  late_fee_amount = amount * 0.05,
  status = 'pending'
WHERE property_id = '5a65574e-ffda-4034-917f-f402b2bd3430'
AND status = 'completed'
LIMIT 1;

UPDATE rent_payments 
SET 
  due_date = CURRENT_DATE - INTERVAL '60 days', 
  days_late = 60,
  late_fee_amount = amount * 0.1,
  status = 'pending'
WHERE property_id = '83bbf428-7634-4e6b-9022-48eaa5ad09be'
AND status = 'completed' 
LIMIT 1;

UPDATE rent_payments 
SET 
  due_date = CURRENT_DATE - INTERVAL '100 days',
  days_late = 100, 
  late_fee_amount = amount * 0.15,
  status = 'pending'
WHERE property_id = '25c0dcdc-458b-495f-99f4-9b2f24faa102'
AND status = 'completed'
LIMIT 1;