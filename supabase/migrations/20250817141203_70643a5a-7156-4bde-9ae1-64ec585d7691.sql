-- Fix the get_holdings_summary function by removing the problematic columns
DROP FUNCTION IF EXISTS public.get_holdings_summary(UUID, UUID);

-- Recreate the function with proper column references
CREATE OR REPLACE FUNCTION public.get_holdings_summary(portfolio_id_param UUID DEFAULT NULL, user_id_param UUID DEFAULT NULL)
RETURNS TABLE(
  total_assets INTEGER,
  total_market_value NUMERIC,
  total_cost_basis NUMERIC,
  total_unrealized_pl NUMERIC,
  total_unrealized_pl_percent NUMERIC,
  total_annual_income NUMERIC,
  top_performer JSONB,
  worst_performer JSONB,
  allocation_by_type JSONB
)
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  WITH asset_summary AS (
    SELECT 
      pa.id,
      pa.asset_name,
      pa.current_value,
      pa.acquisition_cost,
      pa.annual_income,
      COALESCE(pa.metadata->>'symbol', pa.asset_name) as asset_symbol,
      COALESCE(pa.metadata->>'asset_type', 'stock') as asset_type,
      COALESCE((pa.metadata->>'shares')::NUMERIC, 1) as shares,
      amd.current_price,
      amd.price_change_percentage_24h,
      (COALESCE(amd.current_price, pa.current_value) * COALESCE((pa.metadata->>'shares')::NUMERIC, 1)) as market_value,
      (COALESCE(pa.acquisition_cost, pa.asset_value) * COALESCE((pa.metadata->>'shares')::NUMERIC, 1)) as cost_basis
    FROM public.portfolio_assets pa
    LEFT JOIN public.asset_market_data amd ON pa.id = amd.asset_id
    WHERE pa.is_active = true
    AND (
      (portfolio_id_param IS NOT NULL AND pa.portfolio_id = portfolio_id_param) OR
      (user_id_param IS NOT NULL AND has_portfolio_role(pa.portfolio_id, user_id_param, ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]))
    )
  )
  SELECT 
    COUNT(*)::INTEGER as total_assets,
    COALESCE(SUM(market_value), 0) as total_market_value,
    COALESCE(SUM(cost_basis), 0) as total_cost_basis,
    COALESCE(SUM(market_value - cost_basis), 0) as total_unrealized_pl,
    CASE 
      WHEN SUM(cost_basis) > 0 THEN ((SUM(market_value) - SUM(cost_basis)) / SUM(cost_basis) * 100)
      ELSE 0 
    END as total_unrealized_pl_percent,
    COALESCE(SUM(annual_income), 0) as total_annual_income,
    (SELECT jsonb_build_object('symbol', asset_symbol, 'change_percent', price_change_percentage_24h) 
     FROM asset_summary WHERE price_change_percentage_24h IS NOT NULL 
     ORDER BY price_change_percentage_24h DESC LIMIT 1) as top_performer,
    (SELECT jsonb_build_object('symbol', asset_symbol, 'change_percent', price_change_percentage_24h) 
     FROM asset_summary WHERE price_change_percentage_24h IS NOT NULL 
     ORDER BY price_change_percentage_24h ASC LIMIT 1) as worst_performer,
    (SELECT jsonb_object_agg(asset_type, type_value)
     FROM (
       SELECT asset_type, SUM(market_value) as type_value
       FROM asset_summary
       GROUP BY asset_type
     ) grouped) as allocation_by_type
  FROM asset_summary;
$$;