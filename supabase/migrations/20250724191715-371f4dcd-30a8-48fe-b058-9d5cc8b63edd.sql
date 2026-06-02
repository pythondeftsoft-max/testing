-- Create storage bucket for white-label assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('white-label-assets', 'white-label-assets', true);

-- Create policies for white-label asset uploads
CREATE POLICY "White-label assets are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'white-label-assets');

CREATE POLICY "Config owners can upload assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'white-label-assets' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM white_label_configs WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Config owners can update their assets" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'white-label-assets' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM white_label_configs WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Config owners can delete their assets" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'white-label-assets' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM white_label_configs WHERE user_id = auth.uid()
  )
);

-- Create missing analytics tables
CREATE TABLE IF NOT EXISTS public.white_label_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  page_path TEXT,
  domain TEXT,
  visitor_id TEXT,
  session_id TEXT,
  user_agent TEXT,
  referrer TEXT,
  ip_address INET,
  device_type TEXT,
  browser TEXT,
  operating_system TEXT,
  country TEXT,
  city TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  custom_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.white_label_daily_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  bounce_rate NUMERIC DEFAULT 0,
  avg_session_duration NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(config_id, date)
);

CREATE TABLE IF NOT EXISTS public.white_label_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  conversion_type TEXT NOT NULL,
  page_path TEXT,
  value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  conversion_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_white_label_analytics_config_timestamp 
ON white_label_analytics(config_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_white_label_analytics_event_type 
ON white_label_analytics(event_type);

CREATE INDEX IF NOT EXISTS idx_white_label_daily_analytics_config_date 
ON white_label_daily_analytics(config_id, date);

-- Enable RLS on analytics tables
ALTER TABLE public.white_label_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_conversions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for analytics
CREATE POLICY "Config owners can view their analytics" 
ON public.white_label_analytics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM white_label_configs wlc 
    WHERE wlc.id = white_label_analytics.config_id 
    AND wlc.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert analytics" 
ON public.white_label_analytics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Config owners can view their daily analytics" 
ON public.white_label_daily_analytics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM white_label_configs wlc 
    WHERE wlc.id = white_label_daily_analytics.config_id 
    AND wlc.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage daily analytics" 
ON public.white_label_daily_analytics 
FOR ALL 
USING (true);

CREATE POLICY "Config owners can view their conversions" 
ON public.white_label_conversions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM white_label_configs wlc 
    WHERE wlc.id = white_label_conversions.config_id 
    AND wlc.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert conversions" 
ON public.white_label_conversions 
FOR INSERT 
WITH CHECK (true);