-- Phase 2: Enhanced White Label System Tables

-- Analytics tracking table
CREATE TABLE public.white_label_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  page_path TEXT,
  user_agent TEXT,
  ip_address INET,
  session_id TEXT,
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Advanced theme configurations
CREATE TABLE public.white_label_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  theme_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  css_variables JSONB NOT NULL DEFAULT '{}',
  component_overrides JSONB DEFAULT '{}',
  custom_fonts JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(config_id, theme_name)
);

-- Dynamic content management
CREATE TABLE public.white_label_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  page_slug TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'page',
  title TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  meta_tags JSONB DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(config_id, page_slug)
);

-- Email template management
CREATE TABLE public.white_label_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(config_id, template_name)
);

-- API access management
CREATE TABLE public.white_label_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  rate_limit INTEGER DEFAULT 1000,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Webhook configurations
CREATE TABLE public.white_label_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  webhook_name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  secret_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  retry_count INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Performance metrics
CREATE TABLE public.white_label_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.white_label_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for white_label_analytics
CREATE POLICY "Config owners can view their analytics" 
ON public.white_label_analytics FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM white_label_configs wlc 
  WHERE wlc.id = config_id AND wlc.user_id = auth.uid()
));

CREATE POLICY "System can insert analytics" 
ON public.white_label_analytics FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all analytics" 
ON public.white_label_analytics FOR SELECT 
USING (is_admin(auth.uid()));

-- RLS Policies for white_label_themes
CREATE POLICY "Config owners can manage their themes" 
ON public.white_label_themes FOR ALL 
USING (EXISTS (
  SELECT 1 FROM white_label_configs wlc 
  WHERE wlc.id = config_id AND wlc.user_id = auth.uid()
));

CREATE POLICY "Public can view active themes for published configs" 
ON public.white_label_themes FOR SELECT 
USING (
  is_active = true AND 
  EXISTS (
    SELECT 1 FROM white_label_configs wlc 
    WHERE wlc.id = config_id AND wlc.is_active = true
  )
);

-- RLS Policies for white_label_content
CREATE POLICY "Config owners can manage their content" 
ON public.white_label_content FOR ALL 
USING (EXISTS (
  SELECT 1 FROM white_label_configs wlc 
  WHERE wlc.id = config_id AND wlc.user_id = auth.uid()
));

CREATE POLICY "Public can view published content" 
ON public.white_label_content FOR SELECT 
USING (
  is_published = true AND 
  EXISTS (
    SELECT 1 FROM white_label_configs wlc 
    WHERE wlc.id = config_id AND wlc.is_active = true
  )
);

-- RLS Policies for white_label_emails
CREATE POLICY "Config owners can manage their email templates" 
ON public.white_label_emails FOR ALL 
USING (EXISTS (
  SELECT 1 FROM white_label_configs wlc 
  WHERE wlc.id = config_id AND wlc.user_id = auth.uid()
));

-- RLS Policies for white_label_api_keys
CREATE POLICY "Config owners can manage their API keys" 
ON public.white_label_api_keys FOR ALL 
USING (EXISTS (
  SELECT 1 FROM white_label_configs wlc 
  WHERE wlc.id = config_id AND wlc.user_id = auth.uid()
));

-- RLS Policies for white_label_webhooks
CREATE POLICY "Config owners can manage their webhooks" 
ON public.white_label_webhooks FOR ALL 
USING (EXISTS (
  SELECT 1 FROM white_label_configs wlc 
  WHERE wlc.id = config_id AND wlc.user_id = auth.uid()
));

-- RLS Policies for white_label_performance
CREATE POLICY "Config owners can view their performance metrics" 
ON public.white_label_performance FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM white_label_configs wlc 
  WHERE wlc.id = config_id AND wlc.user_id = auth.uid()
));

CREATE POLICY "System can insert performance metrics" 
ON public.white_label_performance FOR INSERT 
WITH CHECK (true);

-- Update triggers for updated_at columns
CREATE TRIGGER update_white_label_themes_updated_at
  BEFORE UPDATE ON public.white_label_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_white_label_content_updated_at
  BEFORE UPDATE ON public.white_label_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_white_label_emails_updated_at
  BEFORE UPDATE ON public.white_label_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_white_label_webhooks_updated_at
  BEFORE UPDATE ON public.white_label_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_white_label_analytics_config_id ON public.white_label_analytics(config_id);
CREATE INDEX idx_white_label_analytics_event_type ON public.white_label_analytics(event_type);
CREATE INDEX idx_white_label_analytics_created_at ON public.white_label_analytics(created_at);
CREATE INDEX idx_white_label_themes_config_id ON public.white_label_themes(config_id);
CREATE INDEX idx_white_label_content_config_id ON public.white_label_content(config_id);
CREATE INDEX idx_white_label_content_page_slug ON public.white_label_content(page_slug);
CREATE INDEX idx_white_label_emails_config_id ON public.white_label_emails(config_id);
CREATE INDEX idx_white_label_api_keys_config_id ON public.white_label_api_keys(config_id);
CREATE INDEX idx_white_label_webhooks_config_id ON public.white_label_webhooks(config_id);
CREATE INDEX idx_white_label_performance_config_id ON public.white_label_performance(config_id);