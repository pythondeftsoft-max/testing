-- Create white_label_analytics table for tracking visitor data
CREATE TABLE IF NOT EXISTS public.white_label_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  visitors INTEGER NOT NULL DEFAULT 0,
  page_views INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  bounce_rate NUMERIC(5,2) DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT white_label_analytics_config_date_key UNIQUE (config_id, date)
);

-- Enable RLS on white_label_analytics
ALTER TABLE public.white_label_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for white_label_analytics
CREATE POLICY "Config owners can manage their analytics"
ON public.white_label_analytics
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.white_label_configs wlc
    WHERE wlc.id = white_label_analytics.config_id
    AND wlc.user_id = auth.uid()
  )
);

CREATE POLICY "Public can view analytics for active configs"
ON public.white_label_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.white_label_configs wlc
    WHERE wlc.id = white_label_analytics.config_id
    AND wlc.is_active = true
  )
);

-- Create white_label_content table for managing content pages
CREATE TABLE IF NOT EXISTS public.white_label_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL,
  page_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSON NOT NULL DEFAULT '{}'::json,
  meta_tags JSON DEFAULT '{}'::json,
  is_published BOOLEAN NOT NULL DEFAULT false,
  content_type TEXT NOT NULL DEFAULT 'page',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT white_label_content_config_slug_key UNIQUE (config_id, page_slug)
);

-- Enable RLS on white_label_content
ALTER TABLE public.white_label_content ENABLE ROW LEVEL SECURITY;

-- Create policies for white_label_content
CREATE POLICY "Config owners can manage their content"
ON public.white_label_content
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.white_label_configs wlc
    WHERE wlc.id = white_label_content.config_id
    AND wlc.user_id = auth.uid()
  )
);

CREATE POLICY "Public can view published content for active configs"
ON public.white_label_content
FOR SELECT
USING (
  is_published = true 
  AND EXISTS (
    SELECT 1 FROM public.white_label_configs wlc
    WHERE wlc.id = white_label_content.config_id
    AND wlc.is_active = true
  )
);

-- Create white_label_security_scans table for security monitoring
CREATE TABLE IF NOT EXISTS public.white_label_security_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL,
  scan_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  results JSON DEFAULT '{}'::json,
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT white_label_security_scans_status_check 
  CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

-- Enable RLS on white_label_security_scans
ALTER TABLE public.white_label_security_scans ENABLE ROW LEVEL SECURITY;

-- Create policies for white_label_security_scans
CREATE POLICY "Config owners can view their security scans"
ON public.white_label_security_scans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.white_label_configs wlc
    WHERE wlc.id = white_label_security_scans.config_id
    AND wlc.user_id = auth.uid()
  )
);

-- Create updated_at triggers for the new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_white_label_analytics_updated_at
  BEFORE UPDATE ON public.white_label_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_white_label_content_updated_at
  BEFORE UPDATE ON public.white_label_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();