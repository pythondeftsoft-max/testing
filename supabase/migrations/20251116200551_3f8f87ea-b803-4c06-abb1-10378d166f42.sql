-- Remove application_credit_returned notifications from the database
DELETE FROM notifications 
WHERE type = 'application_credit_returned';