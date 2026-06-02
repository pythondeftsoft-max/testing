-- Add email_type and auth_metadata columns for unified email tracking
ALTER TABLE email_queue 
ADD COLUMN email_type VARCHAR(50) DEFAULT 'custom' NOT NULL,
ADD COLUMN auth_metadata JSONB;

-- Create index for email type filtering
CREATE INDEX idx_email_queue_type ON email_queue(email_type);

-- Add comment to explain the email_type values
COMMENT ON COLUMN email_queue.email_type IS 'Type of email: custom, auth_confirmation, auth_password_reset, auth_magic_link, auth_invite';