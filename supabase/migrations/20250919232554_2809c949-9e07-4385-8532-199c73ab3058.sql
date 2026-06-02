-- Update days_late for existing overdue rent payments
UPDATE rent_payments 
SET days_late = GREATEST(0, EXTRACT(days FROM (CURRENT_DATE - due_date))::integer)
WHERE status != 'completed' 
  AND due_date < CURRENT_DATE 
  AND days_late = 0;