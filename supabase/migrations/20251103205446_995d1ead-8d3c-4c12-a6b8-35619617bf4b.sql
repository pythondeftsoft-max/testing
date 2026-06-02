-- First, expand the status constraint to include 'failed' status
ALTER TABLE email_queue DROP CONSTRAINT email_queue_status_check;
ALTER TABLE email_queue ADD CONSTRAINT email_queue_status_check 
  CHECK (status IN ('pending', 'sent', 'failed'));

-- Delete emails with NULL to_email (they cannot be sent)
DELETE FROM email_queue WHERE to_email IS NULL;

-- Add NOT NULL constraint to prevent future NULL emails
ALTER TABLE email_queue ALTER COLUMN to_email SET NOT NULL;