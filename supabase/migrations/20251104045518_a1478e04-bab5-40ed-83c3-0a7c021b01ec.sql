-- Fix enum error in get_unified_activity_feed by casting user_type to text
DROP FUNCTION IF EXISTS get_unified_activity_feed(timestamptz, timestamptz, text, uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION get_unified_activity_feed(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_activity_type text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_portfolio_id uuid DEFAULT NULL,
  p_search_query text DEFAULT NULL,
  p_time_range text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  activity_type text,
  "timestamp" timestamptz,
  user_name text,
  user_type text,
  description text,
  status text,
  risk_level text,
  risk_score integer,
  portfolio_name text,
  route text,
  user_agent text,
  metadata jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rel.id,
    rel.user_id,
    rel.action || ':' || rel.object as activity_type,
    rel.created_at as "timestamp",
    COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown User') as user_name,
    COALESCE(p.user_type::text, 'unknown') as user_type,
    CASE 
      WHEN rel.allowed THEN 'Successfully ' || rel.action || 'ed ' || rel.object
      ELSE 'Access denied: Attempted to ' || rel.action || ' ' || rel.object
    END as description,
    CASE WHEN rel.allowed THEN 'success' ELSE 'denied' END as status,
    CASE WHEN rel.allowed THEN 'low' ELSE 'high' END as risk_level,
    CASE WHEN rel.allowed THEN 0 ELSE 100 END as risk_score,
    po.client_name as portfolio_name,
    COALESCE(rel.route, '') as route,
    COALESCE(rel.user_agent, '') as user_agent,
    COALESCE(rel.metadata, '{}'::jsonb) as metadata
  FROM rbac_audit_logs rel
  LEFT JOIN profiles p ON p.id = rel.user_id
  LEFT JOIN portfolios po ON po.id = rel.portfolio_id
  WHERE 
    (p_start_date IS NULL OR rel.created_at >= p_start_date)
    AND (p_end_date IS NULL OR rel.created_at <= p_end_date)
    AND (p_activity_type IS NULL OR (rel.action || ':' || rel.object) = p_activity_type)
    AND (p_user_id IS NULL OR rel.user_id = p_user_id)
    AND (p_portfolio_id IS NULL OR rel.portfolio_id = p_portfolio_id)
    AND (p_search_query IS NULL OR 
         rel.object ILIKE '%' || p_search_query || '%' OR
         rel.action ILIKE '%' || p_search_query || '%' OR
         COALESCE(p.first_name || ' ' || p.last_name, p.email, '') ILIKE '%' || p_search_query || '%' OR
         po.client_name ILIKE '%' || p_search_query || '%')
  ORDER BY rel.created_at DESC;
END;
$$;