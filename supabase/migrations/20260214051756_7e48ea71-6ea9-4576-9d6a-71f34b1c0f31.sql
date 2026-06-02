
-- Gap 1 + 9: Add missing columns to sms_messages
ALTER TABLE public.sms_messages
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS landlord_id UUID,
  ADD COLUMN IF NOT EXISTS worker_owner_id UUID,
  ADD COLUMN IF NOT EXISTS receiver_phone TEXT,
  ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS timestamp_sent TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timestamp_delivered TIMESTAMPTZ;

-- Create index on worker_owner_id for performance
CREATE INDEX IF NOT EXISTS idx_sms_messages_worker_owner ON public.sms_messages(worker_owner_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_tenant ON public.sms_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_landlord ON public.sms_messages(landlord_id);

-- Gap 7: Create worker SMS metrics view
CREATE OR REPLACE VIEW public.worker_sms_metrics AS
SELECT
  m.sender_user_id AS worker_id,
  COUNT(*) FILTER (WHERE m.direction = 'outbound') AS messages_sent,
  COUNT(*) FILTER (WHERE m.direction = 'inbound') AS messages_received,
  COUNT(*) FILTER (WHERE m.delivery_status = 'delivered') AS delivered_count,
  COUNT(*) FILTER (WHERE m.delivery_status = 'failed' OR m.delivery_status = 'undelivered') AS failed_count,
  ROUND(
    COUNT(*) FILTER (WHERE m.delivery_status = 'delivered')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE m.direction = 'outbound'), 0) * 100, 1
  ) AS delivery_rate_pct,
  COUNT(DISTINCT m.conversation_id) AS total_conversations,
  MIN(m.created_at) AS first_message_at,
  MAX(m.created_at) AS last_message_at
FROM public.sms_messages m
WHERE m.sender_user_id IS NOT NULL
  AND m.sender_role IN ('worker', 'admin')
GROUP BY m.sender_user_id;
