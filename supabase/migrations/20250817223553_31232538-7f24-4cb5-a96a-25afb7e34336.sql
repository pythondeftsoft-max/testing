-- Fix search_path for get_rbac_stats function  
CREATE OR REPLACE FUNCTION public.get_rbac_stats()
RETURNS TABLE(
  total_events INTEGER,
  denied_events INTEGER,
  denial_rate NUMERIC,
  unique_users INTEGER,
  top_denied_objects JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count INTEGER;
  denied_count INTEGER;
  user_count INTEGER;
  top_objects JSONB;
BEGIN
  -- Get total events count
  SELECT COUNT(*) INTO total_count FROM public.rbac_audit_logs;
  
  -- Get denied events count
  SELECT COUNT(*) INTO denied_count FROM public.rbac_audit_logs WHERE allowed = false;
  
  -- Get unique users count
  SELECT COUNT(DISTINCT user_id) INTO user_count FROM public.rbac_audit_logs;
  
  -- Get top denied objects
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('object', object, 'count', count)
      ORDER BY count DESC
    ), 
    '[]'::jsonb
  ) INTO top_objects
  FROM (
    SELECT object, COUNT(*) as count
    FROM public.rbac_audit_logs 
    WHERE allowed = false
    GROUP BY object
    ORDER BY count DESC
    LIMIT 5
  ) subquery;
  
  -- Return results
  RETURN QUERY SELECT 
    total_count,
    denied_count,
    CASE 
      WHEN total_count > 0 THEN (denied_count::NUMERIC / total_count::NUMERIC * 100)
      ELSE 0::NUMERIC
    END as denial_rate,
    user_count,
    top_objects;
END;
$$;

-- Also fix the log_rbac_event function
CREATE OR REPLACE FUNCTION public.log_rbac_event(
  p_scope TEXT,
  p_object TEXT,
  p_action TEXT,
  p_portfolio_id UUID DEFAULT NULL,
  p_allowed BOOLEAN DEFAULT FALSE,
  p_source TEXT DEFAULT 'client',
  p_route TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rbac_audit_logs (
    user_id,
    scope,
    object,
    action,
    portfolio_id,
    allowed,
    source,
    route,
    user_agent,
    metadata
  ) VALUES (
    auth.uid(),
    p_scope,
    p_object,
    p_action,
    p_portfolio_id,
    p_allowed,
    p_source,
    p_route,
    p_user_agent,
    p_metadata
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently to not disrupt user experience
    RETURN FALSE;
END;
$$;