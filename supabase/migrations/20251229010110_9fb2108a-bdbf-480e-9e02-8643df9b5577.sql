-- Add missing indexes on messages table for application IDs
-- These are critical for RLS policy performance to prevent timeout errors

CREATE INDEX IF NOT EXISTS idx_messages_marketplace_application_id 
  ON public.messages (marketplace_application_id);

CREATE INDEX IF NOT EXISTS idx_messages_property_application_id 
  ON public.messages (property_application_id);

-- Add composite indexes for common query patterns (sorting by created_at)
CREATE INDEX IF NOT EXISTS idx_messages_marketplace_app_created 
  ON public.messages (marketplace_application_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_property_app_created 
  ON public.messages (property_application_id, created_at);