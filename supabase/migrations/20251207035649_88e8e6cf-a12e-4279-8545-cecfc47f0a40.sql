-- Update get_portfolio_metrics to accept explicit user ID parameter
CREATE OR REPLACE FUNCTION public.get_portfolio_metrics(
  p_portfolio_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  unit_count BIGINT,
  occupancy_rate NUMERIC,
  monthly_profit NUMERIC,
  gross_monthly_rent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_effective_user_id UUID;
BEGIN
  -- Use explicit user ID if provided, otherwise fall back to auth.uid()
  v_effective_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  WITH property_data AS (
    SELECT 
      p.id as property_id,
      p.portfolio_id
    FROM properties p
    WHERE p.owner_id = v_effective_user_id
      AND p.deleted_at IS NULL
      AND (p_portfolio_id IS NULL OR p.portfolio_id = p_portfolio_id)
  ),
  unit_data AS (
    SELECT 
      pu.id as unit_id,
      pu.property_id,
      pu.monthly_rent,
      CASE WHEN pu.status = 'occupied' THEN 1 ELSE 0 END as is_occupied
    FROM property_units pu
    INNER JOIN property_data pd ON pu.property_id = pd.property_id
  )
  SELECT 
    COALESCE(COUNT(ud.unit_id), 0)::BIGINT as unit_count,
    CASE 
      WHEN COUNT(ud.unit_id) > 0 
      THEN ROUND((SUM(ud.is_occupied)::NUMERIC / COUNT(ud.unit_id)::NUMERIC) * 100, 1)
      ELSE 0::NUMERIC 
    END as occupancy_rate,
    COALESCE(SUM(ud.monthly_rent), 0)::NUMERIC as monthly_profit,
    COALESCE(SUM(ud.monthly_rent), 0)::NUMERIC as gross_monthly_rent
  FROM unit_data ud;
END;
$$;