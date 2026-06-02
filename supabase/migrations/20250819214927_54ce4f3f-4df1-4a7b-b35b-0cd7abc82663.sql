-- Create marketplace events table for analytics
CREATE TABLE public.marketplace_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own events" 
ON public.marketplace_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own events" 
ON public.marketplace_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all events" 
ON public.marketplace_events 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Create index for performance
CREATE INDEX idx_marketplace_events_user_created ON public.marketplace_events (user_id, created_at);
CREATE INDEX idx_marketplace_events_type_created ON public.marketplace_events (event_type, created_at);

-- Create marketplace funnel analytics function
CREATE OR REPLACE FUNCTION public.get_marketplace_funnel(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  guard_shown INTEGER,
  opt_in_clicked INTEGER,
  access_granted INTEGER,
  search_view_loaded INTEGER,
  search_performed INTEGER,
  application_started INTEGER,
  application_submitted INTEGER,
  by_business_phase JSONB,
  by_tenant_type JSONB
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH event_counts AS (
    SELECT 
      COUNT(CASE WHEN event_type = 'guard_shown' THEN 1 END)::INTEGER as guard_shown,
      COUNT(CASE WHEN event_type = 'opt_in_clicked' THEN 1 END)::INTEGER as opt_in_clicked,
      COUNT(CASE WHEN event_type = 'access_granted' THEN 1 END)::INTEGER as access_granted,
      COUNT(CASE WHEN event_type = 'search_view_loaded' THEN 1 END)::INTEGER as search_view_loaded,
      COUNT(CASE WHEN event_type = 'search_performed' THEN 1 END)::INTEGER as search_performed,
      COUNT(CASE WHEN event_type = 'application_started' THEN 1 END)::INTEGER as application_started,
      COUNT(CASE WHEN event_type = 'application_submitted' THEN 1 END)::INTEGER as application_submitted
    FROM public.marketplace_events
    WHERE created_at::DATE BETWEEN p_start_date AND p_end_date
  ),
  phase_breakdown AS (
    SELECT jsonb_object_agg(
      COALESCE(metadata->>'business_phase', 'unknown'),
      jsonb_build_object(
        'guard_shown', COUNT(CASE WHEN event_type = 'guard_shown' THEN 1 END),
        'opt_in_clicked', COUNT(CASE WHEN event_type = 'opt_in_clicked' THEN 1 END),
        'access_granted', COUNT(CASE WHEN event_type = 'access_granted' THEN 1 END),
        'search_performed', COUNT(CASE WHEN event_type = 'search_performed' THEN 1 END)
      )
    ) as phase_data
    FROM public.marketplace_events
    WHERE created_at::DATE BETWEEN p_start_date AND p_end_date
    GROUP BY metadata->>'business_phase'
  ),
  tenant_breakdown AS (
    SELECT jsonb_object_agg(
      COALESCE(metadata->>'tenant_type', 'unknown'),
      jsonb_build_object(
        'guard_shown', COUNT(CASE WHEN event_type = 'guard_shown' THEN 1 END),
        'opt_in_clicked', COUNT(CASE WHEN event_type = 'opt_in_clicked' THEN 1 END),
        'access_granted', COUNT(CASE WHEN event_type = 'access_granted' THEN 1 END),
        'search_performed', COUNT(CASE WHEN event_type = 'search_performed' THEN 1 END)
      )
    ) as tenant_data
    FROM public.marketplace_events
    WHERE created_at::DATE BETWEEN p_start_date AND p_end_date
    GROUP BY metadata->>'tenant_type'
  )
  SELECT 
    ec.guard_shown,
    ec.opt_in_clicked,
    ec.access_granted,
    ec.search_view_loaded,
    ec.search_performed,
    ec.application_started,
    ec.application_submitted,
    COALESCE(pb.phase_data, '{}'::jsonb) as by_business_phase,
    COALESCE(tb.tenant_data, '{}'::jsonb) as by_tenant_type
  FROM event_counts ec
  CROSS JOIN phase_breakdown pb
  CROSS JOIN tenant_breakdown tb;
END;
$function$;