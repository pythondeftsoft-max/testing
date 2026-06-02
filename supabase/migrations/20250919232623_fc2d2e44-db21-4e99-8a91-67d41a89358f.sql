-- Update days_late for existing overdue rent payments
UPDATE rent_payments 
SET days_late = GREATEST(0, (CURRENT_DATE - due_date::date)::integer)
WHERE status != 'completed' 
  AND due_date < CURRENT_DATE 
  AND days_late = 0;