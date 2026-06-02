-- Create tables for comprehensive asset tracking and portfolio management

-- Table for asset price history
CREATE TABLE IF NOT EXISTS public.asset_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES public.portfolio_assets(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  date_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  interval_type TEXT NOT NULL DEFAULT '1D', -- 1m, 5m, 15m, 1h, 1D, 1W, 1M
  open_price NUMERIC,
  high_price NUMERIC,
  low_price NUMERIC,
  close_price NUMERIC,
  volume BIGINT,
  data_source TEXT NOT NULL DEFAULT 'yahoo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(asset_id, symbol, date_time, interval_type)
);

-- Table for asset transactions (buy/sell/transfer/dividend)
CREATE TABLE IF NOT EXISTS public.asset_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES public.portfolio_assets(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT', 'DIVIDEND', 'SPLIT', 'MERGER', 'SPINOFF')),
  symbol TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  fees NUMERIC NOT NULL DEFAULT 0,
  transaction_date DATE NOT NULL,
  notes TEXT,
  source_account TEXT,
  destination_account TEXT,
  tax_lot_method TEXT DEFAULT 'FIFO',
  is_imported BOOLEAN DEFAULT false,
  import_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Table for asset income (dividends, interest, staking rewards)
CREATE TABLE IF NOT EXISTS public.asset_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES public.portfolio_assets(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  income_type TEXT NOT NULL CHECK (income_type IN ('DIVIDEND', 'INTEREST', 'STAKING', 'BOND_COUPON', 'REIT_DISTRIBUTION', 'CAPITAL_GAIN')),
  symbol TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_date DATE NOT NULL,
  ex_dividend_date DATE,
  record_date DATE,
  declared_date DATE,
  rate_per_share NUMERIC,
  shares_on_record NUMERIC,
  is_qualified BOOLEAN DEFAULT true,
  is_reinvested BOOLEAN DEFAULT false,
  reinvestment_price NUMERIC,
  reinvestment_shares NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Table for price alerts
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID REFERENCES public.portfolio_assets(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('PRICE_ABOVE', 'PRICE_BELOW', 'CHANGE_PERCENT_ABOVE', 'CHANGE_PERCENT_BELOW', 'VOLUME_SPIKE')),
  threshold_value NUMERIC NOT NULL,
  current_value NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_triggered BOOLEAN NOT NULL DEFAULT false,
  triggered_at TIMESTAMPTZ,
  notification_method TEXT DEFAULT 'in_app',
  message TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for symbol mappings (crypto ticker to CoinGecko ID, etc)
CREATE TABLE IF NOT EXISTS public.symbol_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  exchange TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'etf', 'crypto', 'bond', 'commodity', 'index')),
  external_id TEXT, -- CoinGecko ID, Yahoo symbol, etc
  data_source TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(symbol, asset_type, data_source)
);

-- Table for FX rates (optional for multi-currency)
CREATE TABLE IF NOT EXISTS public.fx_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  target_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source TEXT NOT NULL DEFAULT 'ecb',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(base_currency, target_currency, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_price_history_asset_symbol ON public.asset_price_history(asset_id, symbol, date_time DESC);
CREATE INDEX IF NOT EXISTS idx_asset_price_history_symbol_date ON public.asset_price_history(symbol, date_time DESC);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_asset_date ON public.asset_transactions(asset_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_portfolio_date ON public.asset_transactions(portfolio_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_asset_income_asset_date ON public.asset_income(asset_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_asset_income_portfolio_date ON public.asset_income(portfolio_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_active ON public.price_alerts(user_id, is_active, is_triggered);
CREATE INDEX IF NOT EXISTS idx_symbol_mappings_symbol_type ON public.symbol_mappings(symbol, asset_type);

-- Enable RLS
ALTER TABLE public.asset_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symbol_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_price_history
CREATE POLICY "Portfolio members can view asset price history" ON public.asset_price_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_assets pa
    WHERE pa.id = asset_price_history.asset_id
    AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
  )
);

CREATE POLICY "Portfolio editors can manage asset price history" ON public.asset_price_history
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_assets pa
    WHERE pa.id = asset_price_history.asset_id
    AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  )
);

-- RLS Policies for asset_transactions
CREATE POLICY "Portfolio members can view asset transactions" ON public.asset_transactions
FOR SELECT USING (
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
);

CREATE POLICY "Portfolio editors can manage asset transactions" ON public.asset_transactions
FOR ALL USING (
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
);

-- RLS Policies for asset_income
CREATE POLICY "Portfolio members can view asset income" ON public.asset_income
FOR SELECT USING (
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
);

CREATE POLICY "Portfolio editors can manage asset income" ON public.asset_income
FOR ALL USING (
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
);

-- RLS Policies for price_alerts
CREATE POLICY "Users can manage their own price alerts" ON public.price_alerts
FOR ALL USING (user_id = auth.uid());

-- RLS Policies for symbol_mappings (read-only for authenticated users)
CREATE POLICY "Authenticated users can view symbol mappings" ON public.symbol_mappings
FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- RLS Policies for fx_rates (read-only for authenticated users)
CREATE POLICY "Authenticated users can view FX rates" ON public.fx_rates
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Function to get user accessible assets (for "Everything" mode)
CREATE OR REPLACE FUNCTION public.get_user_accessible_assets(user_id_param UUID)
RETURNS TABLE(
  id UUID,
  portfolio_id UUID,
  portfolio_name TEXT,
  asset_category_id UUID,
  asset_name TEXT,
  asset_description TEXT,
  asset_value NUMERIC,
  acquisition_date DATE,
  acquisition_cost NUMERIC,
  current_value NUMERIC,
  annual_income NUMERIC,
  annual_expenses NUMERIC,
  metadata JSONB,
  tags TEXT[],
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  asset_category JSONB
)
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT 
    pa.id,
    pa.portfolio_id,
    p.client_name as portfolio_name,
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
    to_jsonb(ac.*) as asset_category
  FROM public.portfolio_assets pa
  JOIN public.portfolios p ON pa.portfolio_id = p.id
  LEFT JOIN public.asset_categories ac ON pa.asset_category_id = ac.id
  WHERE pa.is_active = true
  AND has_portfolio_role(pa.portfolio_id, user_id_param, ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
  ORDER BY pa.updated_at DESC;
$$;

-- Function to get holdings summary with market data
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
      COALESCE(pa.metadata->>'symbol', pa.asset_name) as symbol,
      COALESCE(pa.metadata->>'asset_type', 'stock') as asset_type,
      COALESCE(pa.metadata->>'shares', '1')::NUMERIC as shares,
      amd.current_price,
      amd.price_change_percentage_24h,
      (COALESCE(amd.current_price, pa.current_value) * COALESCE(pa.metadata->>'shares', '1')::NUMERIC) as market_value,
      (COALESCE(pa.acquisition_cost, pa.asset_value) * COALESCE(pa.metadata->>'shares', '1')::NUMERIC) as cost_basis
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
    (SELECT jsonb_build_object('symbol', symbol, 'change_percent', price_change_percentage_24h) 
     FROM asset_summary WHERE price_change_percentage_24h IS NOT NULL 
     ORDER BY price_change_percentage_24h DESC LIMIT 1) as top_performer,
    (SELECT jsonb_build_object('symbol', symbol, 'change_percent', price_change_percentage_24h) 
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

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_asset_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_asset_price_history_updated_at
  BEFORE UPDATE ON public.asset_price_history
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_tables_updated_at();

CREATE TRIGGER update_asset_transactions_updated_at
  BEFORE UPDATE ON public.asset_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_tables_updated_at();

CREATE TRIGGER update_asset_income_updated_at
  BEFORE UPDATE ON public.asset_income
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_tables_updated_at();

CREATE TRIGGER update_price_alerts_updated_at
  BEFORE UPDATE ON public.price_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_tables_updated_at();

CREATE TRIGGER update_symbol_mappings_updated_at
  BEFORE UPDATE ON public.symbol_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_tables_updated_at();