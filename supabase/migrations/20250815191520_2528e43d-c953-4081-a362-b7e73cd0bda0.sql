
-- Create market_data_sources table to track different data providers
CREATE TABLE public.market_data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  base_url TEXT,
  api_key_required BOOLEAN NOT NULL DEFAULT true,
  supported_asset_types TEXT[] NOT NULL DEFAULT '{}',
  rate_limit_per_minute INTEGER DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name)
);

-- Create asset_market_data table for current market prices and metrics
CREATE TABLE public.asset_market_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.portfolio_assets(id) ON DELETE CASCADE,
  data_source_id UUID NOT NULL REFERENCES public.market_data_sources(id),
  current_price NUMERIC(15,8),
  market_cap NUMERIC(20,2),
  volume_24h NUMERIC(20,2),
  price_change_24h NUMERIC(10,4),
  price_change_percentage_24h NUMERIC(8,4),
  circulating_supply NUMERIC(20,2),
  total_supply NUMERIC(20,2),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(asset_id, data_source_id)
);

-- Create asset_price_history table for historical price tracking
CREATE TABLE public.asset_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.portfolio_assets(id) ON DELETE CASCADE,
  data_source_id UUID NOT NULL REFERENCES public.market_data_sources(id),
  price NUMERIC(15,8) NOT NULL,
  market_cap NUMERIC(20,2),
  volume NUMERIC(20,2),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(asset_id, data_source_id, recorded_at)
);

-- Add indexes for performance
CREATE INDEX idx_asset_market_data_asset_id ON public.asset_market_data(asset_id);
CREATE INDEX idx_asset_market_data_last_updated ON public.asset_market_data(last_updated);
CREATE INDEX idx_asset_price_history_asset_id ON public.asset_price_history(asset_id);
CREATE INDEX idx_asset_price_history_recorded_at ON public.asset_price_history(recorded_at);
CREATE INDEX idx_asset_price_history_asset_recorded ON public.asset_price_history(asset_id, recorded_at);

-- Set up RLS policies for market_data_sources (public read access)
ALTER TABLE public.market_data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active market data sources"
  ON public.market_data_sources
  FOR SELECT
  USING (is_active = true);

-- Set up RLS policies for asset_market_data
ALTER TABLE public.asset_market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio members can view asset market data"
  ON public.asset_market_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_assets pa
      WHERE pa.id = asset_market_data.asset_id
      AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
    )
  );

CREATE POLICY "Portfolio editors can manage asset market data"
  ON public.asset_market_data
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_assets pa
      WHERE pa.id = asset_market_data.asset_id
      AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
    )
  );

-- Set up RLS policies for asset_price_history
ALTER TABLE public.asset_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio members can view asset price history"
  ON public.asset_price_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_assets pa
      WHERE pa.id = asset_price_history.asset_id
      AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
    )
  );

CREATE POLICY "Portfolio editors can manage asset price history"
  ON public.asset_price_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_assets pa
      WHERE pa.id = asset_price_history.asset_id
      AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
    )
  );

-- Add update triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_market_data_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_asset_market_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_market_data_sources_updated_at_trigger
  BEFORE UPDATE ON public.market_data_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_market_data_sources_updated_at();

CREATE TRIGGER update_asset_market_data_updated_at_trigger
  BEFORE UPDATE ON public.asset_market_data
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_market_data_updated_at();

-- Insert default market data sources
INSERT INTO public.market_data_sources (name, display_name, base_url, api_key_required, supported_asset_types, rate_limit_per_minute) VALUES
('coingecko', 'CoinGecko', 'https://api.coingecko.com/api/v3', false, ARRAY['cryptocurrency'], 50),
('alpha_vantage', 'Alpha Vantage', 'https://www.alphavantage.co/query', true, ARRAY['stocks', 'fixed_income'], 5),
('manual', 'Manual Entry', null, false, ARRAY['cryptocurrency', 'stocks', 'fixed_income', 'real_estate', 'collectibles'], 1000);
