-- Create the get_rbac_stats RPC function
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