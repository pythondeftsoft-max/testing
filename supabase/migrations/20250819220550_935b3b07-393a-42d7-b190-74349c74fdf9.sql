-- Create get_business_phase function
CREATE OR REPLACE FUNCTION public.get_business_phase(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get user profile data
  SELECT * INTO user_profile 
  FROM public.profiles 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'startup';
  END IF;
  
  -- Simple business phase logic based on user type and data
  IF user_profile.user_type = 'tenant' THEN
    RETURN 'tenant_seeking';
  ELSIF user_profile.user_type = 'landlord' THEN
    -- Check if they have properties
    IF EXISTS(SELECT 1 FROM public.properties WHERE owner_id = p_user_id) THEN
      RETURN 'established';
    ELSE
      RETURN 'startup';
    END IF;
  ELSE
    RETURN 'startup';
  END IF;
END;
$$;

-- Create set_business_phase function
CREATE OR REPLACE FUNCTION public.set_business_phase(p_user_id UUID, p_business_phase TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user metadata with business phase
  UPDATE public.profiles 
  SET metadata = COALESCE(metadata, '{}') || jsonb_build_object('business_phase', p_business_phase),
      updated_at = now()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Create get_marketplace_funnel function
CREATE OR REPLACE FUNCTION public.get_marketplace_funnel(
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL
)
RETURNS TABLE(
  guard_shown BIGINT,
  opt_in_clicked BIGINT, 
  access_granted BIGINT,
  search_view_loaded BIGINT,
  search_performed BIGINT,
  application_started BIGINT,
  application_submitted BIGINT,
  card_shown BIGINT,
  cta_clicked BIGINT,
  by_business_phase JSONB
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  start_date_filter DATE;
  end_date_filter DATE;
BEGIN
  -- Set default dates if not provided
  start_date_filter := COALESCE(p_start_date::DATE, CURRENT_DATE - INTERVAL '30 days');
  end_date_filter := COALESCE(p_end_date::DATE, CURRENT_DATE);

  RETURN QUERY
  WITH event_counts AS (
    SELECT 
      COUNT(*) FILTER (WHERE event_type = 'guard_shown') as guard_shown,
      COUNT(*) FILTER (WHERE event_type = 'opt_in_clicked') as opt_in_clicked,
      COUNT(*) FILTER (WHERE event_type = 'access_granted') as access_granted,
      COUNT(*) FILTER (WHERE event_type = 'search_view_loaded') as search_view_loaded,
      COUNT(*) FILTER (WHERE event_type = 'search_performed') as search_performed,
      COUNT(*) FILTER (WHERE event_type = 'application_started') as application_started,
      COUNT(*) FILTER (WHERE event_type = 'application_submitted') as application_submitted,
      COUNT(*) FILTER (WHERE event_type = 'card_shown') as card_shown,
      COUNT(*) FILTER (WHERE event_type = 'cta_clicked') as cta_clicked
    FROM public.marketplace_events me
    WHERE me.created_at::DATE BETWEEN start_date_filter AND end_date_filter
  ),
  business_phase_breakdown AS (
    SELECT jsonb_object_agg(
      COALESCE(me.metadata->>'business_phase', 'unknown'),
      jsonb_build_object(
        'guard_shown', COUNT(*) FILTER (WHERE event_type = 'guard_shown'),
        'opt_in_clicked', COUNT(*) FILTER (WHERE event_type = 'opt_in_clicked'),
        'search_performed', COUNT(*) FILTER (WHERE event_type = 'search_performed')
      )
    ) as by_business_phase
    FROM public.marketplace_events me
    WHERE me.created_at::DATE BETWEEN start_date_filter AND end_date_filter
    GROUP BY me.metadata->>'business_phase'
  )
  SELECT 
    ec.guard_shown,
    ec.opt_in_clicked,
    ec.access_granted,
    ec.search_view_loaded,
    ec.search_performed,
    ec.application_started,
    ec.application_submitted,
    ec.card_shown,
    ec.cta_clicked,
    COALESCE(bpb.by_business_phase, '{}'::jsonb)
  FROM event_counts ec
  CROSS JOIN business_phase_breakdown bpb;
END;
$$;