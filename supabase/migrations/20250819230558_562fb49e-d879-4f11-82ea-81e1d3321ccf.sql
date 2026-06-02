-- Add performance indexes for marketplace_events analytics
CREATE INDEX IF NOT EXISTS idx_marketplace_events_event_created_at ON public.marketplace_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_events_user_created_at ON public.marketplace_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_events_metadata_gin ON public.marketplace_events USING GIN (metadata jsonb_path_ops);