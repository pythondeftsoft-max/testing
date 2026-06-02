-- Add sent_at column to track when emails are actually sent
ALTER TABLE email_queue 
ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance when sorting by sent_at
CREATE INDEX idx_email_queue_sent_at ON email_queue(sent_at DESC NULLS LAST);

-- Backfill existing sent emails with updated_at as approximation
UPDATE email_queue 
SET sent_at = updated_at 
WHERE status = 'sent' AND sent_at IS NULL;