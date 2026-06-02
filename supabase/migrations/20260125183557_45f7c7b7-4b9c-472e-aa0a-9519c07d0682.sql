-- Create innovation_ideas table for capturing and analyzing ideas from social media
CREATE TABLE public.innovation_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  source_url TEXT,
  source_platform TEXT CHECK (source_platform IN ('tiktok', 'instagram', 'youtube', 'twitter', 'linkedin', 'other')),
  video_transcript TEXT,
  raw_description TEXT,
  ai_analysis JSONB,
  tool_name TEXT,
  applicability TEXT,
  category TEXT CHECK (category IN ('ai_sales', 'ai_tools', 'seo', 'automation', 'ui_ux', 'marketing', 'analytics', 'integration', 'other')),
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
  effort_score INTEGER CHECK (effort_score >= 1 AND effort_score <= 10),
  suggested_tasks JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'analyzed', 'approved', 'rejected', 'implemented')),
  implementation_task_id UUID REFERENCES public.implementation_tasks(id),
  n8n_workflow_run_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.innovation_ideas ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access (using owner and admin_partner roles)
CREATE POLICY "Admins can view all innovation ideas"
ON public.innovation_ideas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE user_id = auth.uid()
    AND role_name IN ('owner', 'admin_partner')
    AND is_active = true
  )
);

CREATE POLICY "Admins can create innovation ideas"
ON public.innovation_ideas
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE user_id = auth.uid()
    AND role_name IN ('owner', 'admin_partner')
    AND is_active = true
  )
);

CREATE POLICY "Admins can update innovation ideas"
ON public.innovation_ideas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE user_id = auth.uid()
    AND role_name IN ('owner', 'admin_partner')
    AND is_active = true
  )
);

CREATE POLICY "Admins can delete innovation ideas"
ON public.innovation_ideas
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE user_id = auth.uid()
    AND role_name IN ('owner', 'admin_partner')
    AND is_active = true
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_innovation_ideas_updated_at
BEFORE UPDATE ON public.innovation_ideas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX idx_innovation_ideas_status ON public.innovation_ideas(status);
CREATE INDEX idx_innovation_ideas_category ON public.innovation_ideas(category);
CREATE INDEX idx_innovation_ideas_user_id ON public.innovation_ideas(user_id);
CREATE INDEX idx_innovation_ideas_created_at ON public.innovation_ideas(created_at DESC);