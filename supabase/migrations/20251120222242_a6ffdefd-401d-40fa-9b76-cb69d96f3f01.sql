-- Fix get_user_accessible_portfolios to only show owned + invited portfolios
-- Account roles should control permissions, not data visibility
CREATE OR REPLACE FUNCTION get_user_accessible_portfolios(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  client_name TEXT,
  property_count BIGINT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Return only owned + explicitly granted portfolios for ALL users
  -- (Account roles control what you can DO, not what you can SEE)
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.client_name,
    COALESCE(COUNT(prop.id), 0)::BIGINT as property_count
  FROM portfolios p
  LEFT JOIN properties prop ON p.id = prop.portfolio_id
  LEFT JOIN portfolio_roles pr ON p.id = pr.portfolio_id 
    AND pr.user_id = p_user_id 
    AND pr.is_active = true
  WHERE p.manager_id = p_user_id OR pr.id IS NOT NULL
  GROUP BY p.id, p.client_name
  ORDER BY p.client_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_accessible_portfolios(UUID) TO authenticated;