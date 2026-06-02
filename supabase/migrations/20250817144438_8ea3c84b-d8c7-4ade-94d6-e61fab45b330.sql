-- Phase 1: Asset-centric core and Everything view
-- Create RPC function to get user accessible assets across all portfolios

CREATE OR REPLACE FUNCTION public.get_user_accessible_assets(user_id_param uuid)
RETURNS TABLE(
  id uuid,
  portfolio_id uuid,
  asset_category_id uuid,
  asset_name text,
  asset_description text,
  asset_value numeric,
  acquisition_date timestamp with time zone,
  acquisition_cost numeric,
  current_value numeric,
  annual_income numeric,
  annual_expenses numeric,
  metadata jsonb,
  tags text[],
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid,
  portfolio_name text,
  asset_category jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    pa.id,
    pa.portfolio_id,
    pa.asset_category_id,
    pa.asset_name,
    pa.asset_description,
    pa.asset_value,
    pa.acquisition_date,
    pa.acquisition_cost,
    pa.current_value,
    pa.annual_income,
    pa.annual_expenses,
    pa.metadata,
    pa.tags,
    pa.is_active,
    pa.created_at,
    pa.updated_at,
    pa.created_by,
    p.client_name as portfolio_name,
    to_jsonb(ac.*) as asset_category
  FROM public.portfolio_assets pa
  JOIN public.portfolios p ON pa.portfolio_id = p.id
  LEFT JOIN public.asset_categories ac ON pa.asset_category_id = ac.id
  WHERE pa.is_active = true
    AND has_portfolio_role(pa.portfolio_id, user_id_param, ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]);
$$;

-- Add performance indexes for asset queries
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_portfolio_active 
ON public.portfolio_assets(portfolio_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_asset_market_data_asset_id 
ON public.asset_market_data(asset_id);

-- Add index for price history queries
CREATE INDEX IF NOT EXISTS idx_asset_price_history_asset_recorded 
ON public.asset_price_history(asset_id, recorded_at DESC);

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_user_accessible_assets(uuid) TO authenticated;