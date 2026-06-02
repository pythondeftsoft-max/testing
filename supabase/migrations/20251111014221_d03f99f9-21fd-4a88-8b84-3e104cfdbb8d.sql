-- Update get_holdings_summary to accept timeframe parameter
DROP FUNCTION IF EXISTS public.get_holdings_summary(UUID, UUID);

-- Recreate with timeframe parameter
CREATE OR REPLACE FUNCTION public.get_holdings_summary(
  portfolio_id_param UUID DEFAULT NULL, 
  user_id_param UUID DEFAULT NULL,
  timeframe_param TEXT DEFAULT 'ytd'
)
RETURNS TABLE(
  total_assets INTEGER,
  total_market_value NUMERIC,
  total_cost_basis NUMERIC,
  total_unrealized_pl NUMERIC,
  total_unrealized_pl_percent NUMERIC,
  total_annual_income NUMERIC,
  top_performer JSONB,
  worst_performer JSONB,
  allocation_by_type JSONB,
  top_movers JSONB
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
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
      CASE 
        WHEN timeframe_param = '24h' THEN amd.price_change_percentage_24h
        WHEN timeframe_param = '7d' THEN amd.price_change_percentage_7d
        WHEN timeframe_param = '30d' THEN amd.price_change_percentage_30d
        WHEN timeframe_param = '90d' THEN amd.price_change_percentage_90d
        WHEN timeframe_param = 'ytd' THEN amd.price_change_percentage_ytd
        WHEN timeframe_param = '1y' THEN amd.price_change_percentage_1y
        ELSE amd.price_change_percentage_ytd
      END as price_change_percentage,
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
  ),
  top_movers_data AS (
    SELECT 
      asset_symbol as symbol,
      price_change_percentage as change_percent,
      timeframe_param as timeframe,
      current_price,
      shares as quantity,
      market_value as total_value,
      cost_basis as acquisition_cost,
      (market_value - cost_basis) as gain_loss_amount,
      asset_type
    FROM asset_summary
    WHERE price_change_percentage IS NOT NULL
    ORDER BY ABS(price_change_percentage) DESC
    LIMIT 10
  )
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(SUM(market_value), 0),
    COALESCE(SUM(cost_basis), 0),
    COALESCE(SUM(market_value - cost_basis), 0),
    CASE 
      WHEN SUM(cost_basis) > 0 THEN ((SUM(market_value) - SUM(cost_basis)) / SUM(cost_basis) * 100)
      ELSE 0 
    END,
    COALESCE(SUM(annual_income), 0),
    (SELECT jsonb_build_object('symbol', asset_symbol, 'change_percent', price_change_percentage) 
     FROM asset_summary WHERE price_change_percentage IS NOT NULL 
     ORDER BY price_change_percentage DESC LIMIT 1),
    (SELECT jsonb_build_object('symbol', asset_symbol, 'change_percent', price_change_percentage) 
     FROM asset_summary WHERE price_change_percentage IS NOT NULL 
     ORDER BY price_change_percentage ASC LIMIT 1),
    (SELECT jsonb_object_agg(asset_type, type_value)
     FROM (
       SELECT asset_type, SUM(market_value) as type_value
       FROM asset_summary
       GROUP BY asset_type
     ) grouped),
    (SELECT jsonb_agg(jsonb_build_object(
      'symbol', symbol,
      'change_percent', change_percent,
      'timeframe', timeframe,
      'current_price', current_price,
      'quantity', quantity,
      'total_value', total_value,
      'acquisition_cost', acquisition_cost,
      'gain_loss_amount', gain_loss_amount,
      'asset_type', asset_type
    ))
     FROM top_movers_data)
  FROM asset_summary;
END;
$function$;