-- Create pending_signups table for server-side signup queue
CREATE TABLE public.pending_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  signup_metadata JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create index for processing queries
CREATE INDEX idx_pending_signups_status ON public.pending_signups(status);
CREATE INDEX idx_pending_signups_email ON public.pending_signups(email);
CREATE INDEX idx_pending_signups_expires ON public.pending_signups(expires_at);

-- Enable RLS - NO user policies means only service role can access
ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON TABLE public.pending_signups IS 'Temporary storage for signup requests when network is unreliable. Only accessible by service role for security.';