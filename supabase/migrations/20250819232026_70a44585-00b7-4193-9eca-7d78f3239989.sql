-- Create enum for application status
CREATE TYPE application_status AS ENUM ('draft', 'submitted', 'withdrawn');

-- Create marketplace_applications table
CREATE TABLE public.marketplace_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID NOT NULL,
  unit_id UUID NULL,
  status application_status NOT NULL DEFAULT 'draft',
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create marketplace_application_events table
CREATE TABLE public.marketplace_application_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.marketplace_applications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_application_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketplace_applications
CREATE POLICY "Users can manage their own applications" 
ON public.marketplace_applications 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications" 
ON public.marketplace_applications 
FOR SELECT 
USING (is_admin(auth.uid()));

-- RLS policies for marketplace_application_events
CREATE POLICY "Users can view events for their applications" 
ON public.marketplace_application_events 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.marketplace_applications 
  WHERE id = application_id AND user_id = auth.uid()
));

CREATE POLICY "System can insert application events" 
ON public.marketplace_application_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all application events" 
ON public.marketplace_application_events 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_marketplace_applications_user_created_at ON public.marketplace_applications(user_id, created_at DESC);
CREATE INDEX idx_marketplace_applications_property_created_at ON public.marketplace_applications(property_id, created_at DESC);
CREATE INDEX idx_marketplace_applications_status ON public.marketplace_applications(status);
CREATE INDEX idx_marketplace_application_events_application_id ON public.marketplace_application_events(application_id);

-- Create updated_at trigger for marketplace_applications
CREATE OR REPLACE FUNCTION public.update_marketplace_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marketplace_applications_updated_at
  BEFORE UPDATE ON public.marketplace_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketplace_applications_updated_at();

-- Create trigger to set submitted_at when status changes to submitted
CREATE OR REPLACE FUNCTION public.set_application_submitted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    NEW.submitted_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_application_submitted_at
  BEFORE UPDATE ON public.marketplace_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_application_submitted_at();

-- Create RPC for marketplace time series data
CREATE OR REPLACE FUNCTION public.get_marketplace_timeseries(
  start_date TEXT DEFAULT NULL,
  end_date TEXT DEFAULT NULL,
  bucket TEXT DEFAULT 'day'
)
RETURNS TABLE(
  date_bucket DATE,
  event_type TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Set default dates if not provided
  IF start_date IS NULL THEN
    start_date := (CURRENT_DATE - INTERVAL '30 days')::TEXT;
  END IF;
  IF end_date IS NULL THEN
    end_date := CURRENT_DATE::TEXT;
  END IF;

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      start_date::DATE,
      end_date::DATE,
      '1 day'::INTERVAL
    )::DATE as date_bucket
  ),
  event_types AS (
    SELECT DISTINCT event_type 
    FROM public.marketplace_events 
    WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE
    UNION
    SELECT 'application_submitted' as event_type
  ),
  marketplace_data AS (
    SELECT 
      created_at::DATE as date_bucket,
      event_type,
      COUNT(*) as count
    FROM public.marketplace_events
    WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE
    GROUP BY created_at::DATE, event_type
  ),
  application_data AS (
    SELECT 
      submitted_at::DATE as date_bucket,
      'application_submitted' as event_type,
      COUNT(*) as count
    FROM public.marketplace_applications
    WHERE submitted_at IS NOT NULL
      AND submitted_at::DATE BETWEEN start_date::DATE AND end_date::DATE
    GROUP BY submitted_at::DATE
  ),
  combined_data AS (
    SELECT * FROM marketplace_data
    UNION ALL
    SELECT * FROM application_data
  )
  SELECT 
    ds.date_bucket,
    et.event_type,
    COALESCE(cd.count, 0) as total_count
  FROM date_series ds
  CROSS JOIN event_types et
  LEFT JOIN combined_data cd ON ds.date_bucket = cd.date_bucket AND et.event_type = cd.event_type
  ORDER BY ds.date_bucket, et.event_type;