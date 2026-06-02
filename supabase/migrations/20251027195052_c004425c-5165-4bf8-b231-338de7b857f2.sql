-- Add extension and event columns to messages table for maintenance notifications
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS extension TEXT,
ADD COLUMN IF NOT EXISTS event TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_extension ON messages(extension);
CREATE INDEX IF NOT EXISTS idx_messages_event ON messages(event);

-- Add comment to document the columns
COMMENT ON COLUMN messages.extension IS 'Message extension type (e.g., maintenance, payment, etc.)';
COMMENT ON COLUMN messages.event IS 'Event type for maintenance messages (e.g., maintenance_request_created, status_updated, etc.)';