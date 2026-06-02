-- Harden analytics security - restrict get_marketplace_funnel to admins
DROP FUNCTION IF EXISTS public.get_marketplace_funnel;

CREATE OR REPLACE FUNCTION public.get_marketplace_funnel(
  start_date text DEFAULT NULL,
  end_date text DEFAULT NULL
)
RETURNS TABLE(
  guard_shown integer,
  opt_in_clicked integer,
  access_granted integer,
  search_view_loaded integer,
  search_performed integer,
  application_started integer,
  application_submitted integer,
  card_shown integer,
  cta_clicked integer,
  by_business_phase jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin using auth.uid()
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.user_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can access marketplace analytics';
  END IF;

  -- Set default dates if not provided
  IF start_date IS NULL THEN
    start_date := (CURRENT_DATE - INTERVAL '30 days')::TEXT;
  END IF;
  IF end_date IS NULL THEN
    end_date := CURRENT_DATE::TEXT;
  END IF;

  RETURN QUERY
  WITH event_counts AS (
    SELECT 
      COUNT(CASE WHEN event_type = 'guard_shown' THEN 1 END)::INTEGER as guard_shown_count,
      COUNT(CASE WHEN event_type = 'opt_in_clicked' THEN 1 END)::INTEGER as opt_in_clicked_count,
      COUNT(CASE WHEN event_type = 'access_granted' THEN 1 END)::INTEGER as access_granted_count,
      COUNT(CASE WHEN event_type = 'search_view_loaded' THEN 1 END)::INTEGER as search_view_loaded_count,
      COUNT(CASE WHEN event_type = 'search_performed' THEN 1 END)::INTEGER as search_performed_count,
      COUNT(CASE WHEN event_type = 'application_started' THEN 1 END)::INTEGER as application_started_count,
      COUNT(CASE WHEN event_type = 'application_submitted' THEN 1 END)::INTEGER as application_submitted_count,
      COUNT(CASE WHEN event_type = 'card_shown' THEN 1 END)::INTEGER as card_shown_count,
      COUNT(CASE WHEN event_type = 'cta_clicked' THEN 1 END)::INTEGER as cta_clicked_count
    FROM public.marketplace_events
    WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE
  ),
  business_phase_breakdown AS (
    SELECT jsonb_object_agg(
      COALESCE(metadata->>'business_phase', 'unknown'),
      jsonb_build_object(
        'guard_shown', COUNT(CASE WHEN event_type = 'guard_shown' THEN 1 END),
        'opt_in_clicked', COUNT(CASE WHEN event_type = 'opt_in_clicked' THEN 1 END),
        'search_view_loaded', COUNT(CASE WHEN event_type = 'search_view_loaded' THEN 1 END),
        'search_performed', COUNT(CASE WHEN event_type = 'search_performed' THEN 1 END)
      )
    ) as breakdown
    FROM public.marketplace_events
    WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE
    GROUP BY metadata->>'business_phase'
  )
  SELECT 
    ec.guard_shown_count,
    ec.opt_in_clicked_count,
    ec.access_granted_count,
    ec.search_view_loaded_count,
    ec.search_performed_count,
    ec.application_started_count,
    ec.application_submitted_count,
    ec.card_shown_count,
    ec.cta_clicked_count,
    COALESCE(bpb.breakdown, '{}'::jsonb)
  FROM event_counts ec
  CROSS JOIN business_phase_breakdown bpb;
END;
$$;

-- Normalize marketplace_events RLS to match user_id pattern
DROP POLICY IF EXISTS "marketplace_events_policy" ON public.marketplace_events;

CREATE POLICY "marketplace_events_insert_policy" 
ON public.marketplace_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "marketplace_events_select_policy" 
ON public.marketplace_events 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.user_type = 'admin'
  )
);