-- Drop existing function to avoid signature conflicts
DROP FUNCTION IF EXISTS public.get_marketplace_funnel(text, text);

-- Create marketplace analytics RPCs
CREATE OR REPLACE FUNCTION public.get_marketplace_funnel(
  start_date text DEFAULT NULL,
  end_date text DEFAULT NULL
)
RETURNS TABLE(
  guard_shown bigint,
  opt_in_clicked bigint,
  access_granted bigint,
  search_view_loaded bigint,
  search_performed bigint,
  application_started bigint,
  application_submitted bigint,
  by_business_phase jsonb
)
LANGUAGE plpgsql
STABLE
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
  WITH funnel_counts AS (
    SELECT 
      COUNT(*) FILTER (WHERE event_type = 'guard_shown') as guard_shown,
      COUNT(*) FILTER (WHERE event_type = 'opt_in_clicked') as opt_in_clicked,
      COUNT(*) FILTER (WHERE event_type = 'access_granted') as access_granted,
      COUNT(*) FILTER (WHERE event_type = 'search_view_loaded') as search_view_loaded,
      COUNT(*) FILTER (WHERE event_type = 'search_performed') as search_performed,
      COUNT(*) FILTER (WHERE event_type = 'application_started') as application_started,
      COUNT(*) FILTER (WHERE event_type = 'application_submitted') as application_submitted
    FROM marketplace_events
    WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE
  ),
  phase_breakdown AS (
    SELECT jsonb_object_agg(
      COALESCE(metadata->>'business_phase', 'unknown'),
      jsonb_build_object(
        'guard_shown', COUNT(*) FILTER (WHERE event_type = 'guard_shown'),
        'opt_in_clicked', COUNT(*) FILTER (WHERE event_type = 'opt_in_clicked'),
        'search_performed', COUNT(*) FILTER (WHERE event_type = 'search_performed')
      )
    ) as by_phase
    FROM marketplace_events
    WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE
    GROUP BY metadata->>'business_phase'
  )
  SELECT 
    fc.guard_shown,
    fc.opt_in_clicked,
    fc.access_granted,
    fc.search_view_loaded,
    fc.search_performed,
    fc.application_started,
    fc.application_submitted,
    COALESCE(pb.by_phase, '{}'::jsonb)
  FROM funnel_counts fc
  CROSS JOIN phase_breakdown pb;
END;
$$;

-- Create marketplace timeseries RPC  
CREATE OR REPLACE FUNCTION public.get_marketplace_timeseries(
  start_date text DEFAULT NULL,
  end_date text DEFAULT NULL
)
RETURNS TABLE(
  date_bucket date,
  event_type text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
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
  SELECT 
    created_at::DATE as date_bucket,
    me.event_type,
    COUNT(*)::bigint as total_count
  FROM marketplace_events me
  WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE
  GROUP BY created_at::DATE, me.event_type
  ORDER BY date_bucket, me.event_type;
END;
$$;