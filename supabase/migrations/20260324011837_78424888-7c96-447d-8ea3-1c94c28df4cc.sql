
-- Agent Tasks table
CREATE TABLE public.agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  detail text,
  requires_approval boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  approved_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Agent Activity Logs table
CREATE TABLE public.agent_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  action text NOT NULL,
  detail text,
  related_agent_id text,
  log_type text NOT NULL DEFAULT 'activity',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Agent Memory table
CREATE TABLE public.agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  ttl_hours integer NOT NULL DEFAULT 24,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

-- RLS: Admins full access, authenticated read-only
CREATE POLICY "Admins full access agent_tasks" ON public.agent_tasks
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read agent_tasks" ON public.agent_tasks
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins full access agent_activity_logs" ON public.agent_activity_logs
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read agent_activity_logs" ON public.agent_activity_logs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins full access agent_memory" ON public.agent_memory
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read agent_memory" ON public.agent_memory
  FOR SELECT TO authenticated
  USING (true);

-- Indexes
CREATE INDEX idx_agent_tasks_agent_id ON public.agent_tasks(agent_id);
CREATE INDEX idx_agent_tasks_status ON public.agent_tasks(status);
CREATE INDEX idx_agent_tasks_requires_approval ON public.agent_tasks(requires_approval) WHERE requires_approval = true;
CREATE INDEX idx_agent_activity_logs_agent_id ON public.agent_activity_logs(agent_id);
CREATE INDEX idx_agent_activity_logs_log_type ON public.agent_activity_logs(log_type);
CREATE INDEX idx_agent_activity_logs_created_at ON public.agent_activity_logs(created_at DESC);
CREATE INDEX idx_agent_memory_agent_id ON public.agent_memory(agent_id);
CREATE INDEX idx_agent_memory_expires_at ON public.agent_memory(expires_at);
