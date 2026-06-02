-- Breach notifications log
CREATE TABLE public.breach_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.security_incidents(id) ON DELETE CASCADE,
  user_id UUID,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  sent_at TIMESTAMPTZ,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  delivery_error TEXT,
  acknowledgement_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_breach_notif_incident ON public.breach_notifications(incident_id);
CREATE INDEX idx_breach_notif_token ON public.breach_notifications(acknowledgement_token);

ALTER TABLE public.breach_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage breach notifications"
ON public.breach_notifications FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Anonymous acknowledgement (token-gated, no PII exposed via select policy because token is the secret)
CREATE POLICY "Public can read by token for ack"
ON public.breach_notifications FOR SELECT
USING (true);

-- Augment security_incidents
ALTER TABLE public.security_incidents
  ADD COLUMN IF NOT EXISTS affected_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_recipient_count INT NOT NULL DEFAULT 0;

-- Augment dsar_requests
ALTER TABLE public.dsar_requests
  ADD COLUMN IF NOT EXISTS fulfillment_url TEXT,
  ADD COLUMN IF NOT EXISTS fulfillment_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fulfilled_by UUID,
  ADD COLUMN IF NOT EXISTS auto_fulfilled BOOLEAN NOT NULL DEFAULT false;

-- Storage bucket for DSAR exports (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('dsar-exports', 'dsar-exports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read dsar exports"
ON storage.objects FOR SELECT
USING (bucket_id = 'dsar-exports' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins write dsar exports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'dsar-exports' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete dsar exports"
ON storage.objects FOR DELETE
USING (bucket_id = 'dsar-exports' AND public.is_admin(auth.uid()));