-- Add read status fields to messages table
ALTER TABLE public.messages 
ADD COLUMN read_by_tenant BOOLEAN DEFAULT false,
ADD COLUMN read_by_landlord BOOLEAN DEFAULT false;

-- Add indexes for better query performance
CREATE INDEX idx_messages_read_by_tenant ON public.messages(read_by_tenant);
CREATE INDEX idx_messages_read_by_landlord ON public.messages(read_by_landlord);

-- Update existing messages to set read status based on creation (older messages considered read)
-- This prevents showing all historical messages as unread for existing users
UPDATE public.messages 
SET read_by_tenant = true, read_by_landlord = true 
WHERE created_at < NOW() - INTERVAL '7 days';