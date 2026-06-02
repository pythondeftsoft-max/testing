-- Create agent_api_keys table for AI agent authentication
CREATE TABLE public.agent_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  api_key_hash TEXT NOT NULL UNIQUE,
  permissions TEXT[] DEFAULT ARRAY['read'],
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_minute INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_used_at TIMESTAMPTZ,
  request_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.agent_api_keys ENABLE ROW LEVEL SECURITY;

-- Only system admins can manage API keys (using system_admins table)
CREATE POLICY "System admins can manage agent API keys"
ON public.agent_api_keys
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.system_admins
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

-- Create agent_api_logs table for audit trail
CREATE TABLE public.agent_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.agent_api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_body JSONB,
  response_status INTEGER,
  response_body JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INTEGER
);

-- Enable RLS on logs
ALTER TABLE public.agent_api_logs ENABLE ROW LEVEL SECURITY;

-- System admins can view logs
CREATE POLICY "System admins can view agent API logs"
ON public.agent_api_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.system_admins
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

-- Index for performance
CREATE INDEX idx_agent_api_keys_hash ON public.agent_api_keys(api_key_hash);
CREATE INDEX idx_agent_api_logs_created_at ON public.agent_api_logs(created_at DESC);
CREATE INDEX idx_agent_api_logs_api_key_id ON public.agent_api_logs(api_key_id);

-- Trigger to update updated_at
CREATE TRIGGER update_agent_api_keys_updated_at
BEFORE UPDATE ON public.agent_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();