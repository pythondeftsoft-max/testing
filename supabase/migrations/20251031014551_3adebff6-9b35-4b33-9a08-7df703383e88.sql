-- Create admin_messages table for direct admin-to-user communications
CREATE TABLE IF NOT EXISTS public.admin_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message_text TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('general', 'maintenance', 'application', 'urgent')) DEFAULT 'general',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_admin_messages_recipient ON public.admin_messages(recipient_user_id, created_at DESC);
CREATE INDEX idx_admin_messages_admin ON public.admin_messages(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_messages_unread ON public.admin_messages(recipient_user_id) WHERE read = false;

-- Enable RLS
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Admins can read all admin messages
CREATE POLICY "Admins can view all admin messages"
  ON public.admin_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Admins can insert messages (check they are admin)
CREATE POLICY "Admins can send messages"
  ON public.admin_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Users can read their own received messages
CREATE POLICY "Users can view their admin messages"
  ON public.admin_messages FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

-- Users can update read status on their messages
CREATE POLICY "Users can mark messages as read"
  ON public.admin_messages FOR UPDATE
  TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_admin_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_messages_updated_at
  BEFORE UPDATE ON public.admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_admin_messages_updated_at();