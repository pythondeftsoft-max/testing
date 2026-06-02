-- Fix get_portfolio_metrics function - remove non-existent column and restore access control
DROP FUNCTION IF EXISTS get_portfolio_metrics(UUID);

CREATE OR REPLACE FUNCTION get_portfolio_metrics(p_portfolio_id UUID DEFAULT NULL)
RETURNS TABLE (
  unit_count BIGINT,
  occupancy_rate NUMERIC,
  monthly_profit NUMERIC,
  gross_monthly_rent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH property_data AS (
    -- Single-family properties (no property_units records)
    SELECT 
      p.unit_count::BIGINT as units,
      CASE WHEN p.status = 'occupied' THEN p.unit_count::BIGINT ELSE 0::BIGINT END as occupied_units,
      COALESCE(p.monthly_rent, 0) as rent
    FROM properties p
    WHERE (p_portfolio_id IS NULL OR p.portfolio_id = p_portfolio_id)
      AND p.unit_count > 0
      AND p.deleted_at IS NULL
      AND p.status != 'deleted'
      AND NOT EXISTS (
        SELECT 1 FROM property_units pu WHERE pu.property_id = p.id
      )
      AND (
        p.owner_id = auth.uid() 
        OR (p.portfolio_id IS NOT NULL AND has_portfolio_role(auth.uid(), p.portfolio_id, ARRAY['admin', 'editor', 'viewer']))
      )
    
    UNION ALL
    
    -- Multi-unit properties (has property_units records)
    SELECT 
      1::BIGINT as units,
      CASE WHEN pu.status = 'occupied' THEN 1::BIGINT ELSE 0::BIGINT END as occupied_units,
      COALESCE(pu.monthly_rent, 0) as rent
    FROM properties p
    INNER JOIN property_units pu ON pu.property_id = p.id
    WHERE (p_portfolio_id IS NULL OR p.portfolio_id = p_portfolio_id)
      AND p.deleted_at IS NULL
      AND p.status != 'deleted'
      AND (
        p.owner_id = auth.uid()
        OR (p.portfolio_id IS NOT NULL AND has_portfolio_role(auth.uid(), p.portfolio_id, ARRAY['admin', 'editor', 'viewer']))
      )
  )
  SELECT
    COALESCE(SUM(pd.units), 0)::BIGINT as unit_count,
    CASE 
      WHEN COALESCE(SUM(pd.units), 0) = 0 THEN 0
      ELSE ROUND((SUM(pd.occupied_units)::NUMERIC / SUM(pd.units)::NUMERIC) * 100, 2)
    END as occupancy_rate,
    COALESCE(SUM(pd.rent * 0.3), 0)::NUMERIC as monthly_profit,
    COALESCE(SUM(pd.rent), 0)::NUMERIC as gross_monthly_rent
  FROM property_data pd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;