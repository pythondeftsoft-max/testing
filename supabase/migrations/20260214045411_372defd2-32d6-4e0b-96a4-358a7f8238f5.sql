
-- ============================================
-- SMS Conversations table
-- ============================================
CREATE TABLE public.sms_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  contact_user_id UUID REFERENCES public.profiles(id),
  assigned_worker_id UUID REFERENCES public.profiles(id),
  property_id UUID REFERENCES public.properties(id),
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by phone
CREATE UNIQUE INDEX idx_sms_conversations_phone ON public.sms_conversations(contact_phone);
CREATE INDEX idx_sms_conversations_worker ON public.sms_conversations(assigned_worker_id);
CREATE INDEX idx_sms_conversations_last_msg ON public.sms_conversations(last_message_at DESC);

-- Enable RLS
ALTER TABLE public.sms_conversations ENABLE ROW LEVEL SECURITY;

-- Workers see only their assigned conversations
CREATE POLICY "Workers see assigned conversations"
  ON public.sms_conversations FOR SELECT
  USING (
    assigned_worker_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE user_id = auth.uid() AND role_name = 'super_admin' AND is_active = true
    )
  );

-- Workers can update their assigned conversations (e.g. mark read)
CREATE POLICY "Workers update assigned conversations"
  ON public.sms_conversations FOR UPDATE
  USING (
    assigned_worker_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE user_id = auth.uid() AND role_name = 'super_admin' AND is_active = true
    )
  );

-- Only service role inserts (via edge functions), but allow super admins too
CREATE POLICY "Admins insert conversations"
  ON public.sms_conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE user_id = auth.uid() AND role_name = 'super_admin' AND is_active = true
    )
  );

-- ============================================
-- SMS Messages table
-- ============================================
CREATE TABLE public.sms_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.sms_conversations(id),
  twilio_message_sid TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('worker', 'admin', 'system', 'contact')),
  sender_user_id UUID REFERENCES public.profiles(id),
  body TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'queued',
  status_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_messages_conversation ON public.sms_messages(conversation_id, created_at);
CREATE INDEX idx_sms_messages_sid ON public.sms_messages(twilio_message_sid);

-- Enable RLS
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

-- Workers see messages in their assigned conversations, admins see all
CREATE POLICY "Users see messages in accessible conversations"
  ON public.sms_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sms_conversations sc
      WHERE sc.id = conversation_id
      AND (
        sc.assigned_worker_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.system_admins
          WHERE user_id = auth.uid() AND role_name = 'super_admin' AND is_active = true
        )
      )
    )
  );

-- Insert policy for authenticated users who have conversation access
CREATE POLICY "Users insert messages in accessible conversations"
  ON public.sms_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sms_conversations sc
      WHERE sc.id = conversation_id
      AND (
        sc.assigned_worker_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.system_admins
          WHERE user_id = auth.uid() AND role_name = 'super_admin' AND is_active = true
        )
      )
    )
  );

-- Update policy (for delivery status updates)
CREATE POLICY "Users update messages in accessible conversations"
  ON public.sms_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sms_conversations sc
      WHERE sc.id = conversation_id
      AND (
        sc.assigned_worker_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.system_admins
          WHERE user_id = auth.uid() AND role_name = 'super_admin' AND is_active = true
        )
      )
    )
  );

-- Trigger for updated_at on conversations
CREATE TRIGGER update_sms_conversations_updated_at
  BEFORE UPDATE ON public.sms_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
