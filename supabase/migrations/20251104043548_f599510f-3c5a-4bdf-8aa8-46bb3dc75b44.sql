-- Drop all versions of get_unified_activity_feed function
DROP FUNCTION IF EXISTS get_unified_activity_feed(timestamptz, timestamptz, text, uuid, uuid, text, text);
DROP FUNCTION IF EXISTS get_unified_activity_feed(uuid, text, text, text, text, text, integer, integer);
DROP FUNCTION IF EXISTS get_unified_activity_feed(text, text, text, text, text, text, integer, integer);
DROP FUNCTION IF EXISTS get_unified_activity_feed();

-- Recreate the correct function with portfolio name fix
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
  activity_type text,
  "timestamp" timestamptz,
  user_name text,
  user_type text,
  description text,
  status text,
  risk_level text,
  portfolio_name text,
  metadata jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rel.id,
    rel.activity_type,
    rel.timestamp,
    COALESCE(p.full_name, p.email, 'Unknown User') as user_name,
    COALESCE(p.role, 'user') as user_type,
    rel.description,
    rel.status,
    rel.risk_level,
    po.client_name as portfolio_name,
    rel.metadata
  FROM rbac_activity_log rel
  LEFT JOIN profiles p ON p.id = rel.user_id
  LEFT JOIN portfolios po ON po.id = rel.portfolio_id
  WHERE 
    (p_start_date IS NULL OR rel.timestamp >= p_start_date)
    AND (p_end_date IS NULL OR rel.timestamp <= p_end_date)
    AND (p_activity_type IS NULL OR rel.activity_type = p_activity_type)
    AND (p_user_id IS NULL OR rel.user_id = p_user_id)
    AND (p_portfolio_id IS NULL OR rel.portfolio_id = p_portfolio_id)
    AND (p_search_query IS NULL OR 
         rel.description ILIKE '%' || p_search_query || '%' OR
         COALESCE(p.full_name, p.email, '') ILIKE '%' || p_search_query || '%' OR
         po.client_name ILIKE '%' || p_search_query || '%')
  ORDER BY rel.timestamp DESC;
END;
$$;