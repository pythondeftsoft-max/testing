
-- Create asset market data sources table to manage different data providers
CREATE TABLE public.asset_market_data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key_required BOOLEAN NOT NULL DEFAULT true,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  supported_asset_types TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default data sources
INSERT INTO public.asset_market_data_sources (name, display_name, base_url, supported_asset_types, priority, metadata) VALUES
('alpha_vantage', 'Alpha Vantage', 'https://www.alphavantage.co/query', ARRAY['stock', 'etf', 'mutual_fund', 'forex'], 1, '{"free_tier_limit": 25}'),
('yahoo_finance', 'Yahoo Finance', 'https://query1.finance.yahoo.com/v8/finance/chart', ARRAY['stock', 'etf', 'crypto', 'commodity'], 2, '{"free_tier": true}'),
('coingecko', 'CoinGecko', 'https://api.coingecko.com/api/v3', ARRAY['crypto'], 3, '{"free_tier_limit": 100}'),
('fed_economic_data', 'FRED Economic Data', 'https://api.stlouisfed.org/fred/series', ARRAY['bond', 'economic_indicator'], 4, '{"free_tier": true}');

-- Create market data cache table for API response caching
CREATE TABLE public.market_data_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  data_source_id UUID REFERENCES public.asset_market_data_sources(id),
  asset_identifier TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  cached_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient cache lookups
CREATE INDEX idx_market_data_cache_key ON public.market_data_cache(cache_key);
CREATE INDEX idx_market_data_cache_expires ON public.market_data_cache(expires_at);
CREATE INDEX idx_market_data_cache_asset ON public.market_data_cache(asset_identifier, asset_type);

-- Enhance existing asset_market_data table with real-time pricing fields
ALTER TABLE public.asset_market_data ADD COLUMN IF NOT EXISTS symbol TEXT;
ALTER TABLE public.asset_market_data ADD COLUMN IF NOT EXISTS exchange TEXT;
ALTER TABLE public.asset_market_data ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.asset_market_data ADD COLUMN IF NOT EXISTS bid_price NUMERIC;
ALTER TABLE public.asset_market_data ADD COLUMN IF NOT EXISTS ask_price NUMERIC;
ALTER TABLE public.asset_market_data ADD COLUMN IF NOT EXISTS day_high NUMERIC;
ALTER TABLE public.asset_market_data ADD COLUMN IF NOT EXISTS day_low NUMERIC;
ALTER TABLE public.asset_market_data ADD COLUMN IF NOT EXISTS week_52_high NUMERIC;
ALTER TABLE public.asset_market_data ADD COLUMN IF NOT EXISTS week_52_low NUMERIC;
ALTER TABLE public.asset_market_data ADD COLUMN IF NOT EXISTS previous_close NUMERIC;
ALTER TABLE public.asset_market_data ADD COLUMN IF NOT EXISTS market_status TEXT DEFAULT 'closed';
ALTER TABLE public.asset_market_data ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual';
ALTER TABLE public.asset_market_data ADD COLUMN IF NOT EXISTS fetch_error TEXT;
ALTER TABLE public.asset_market_data ADD COLUMN IF NOT EXISTS auto_update_enabled BOOLEAN DEFAULT true;

-- Add RLS policies for new tables
ALTER TABLE public.asset_market_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can view active data sources
CREATE POLICY "Anyone can view active data sources" 
  ON public.asset_market_data_sources 
  FOR SELECT 
  USING (is_active = true);

-- Portfolio members can view cached market data for their assets
CREATE POLICY "Portfolio members can view market data cache" 
  ON public.market_data_cache 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM portfolio_assets pa 
    WHERE (pa.metadata->>'symbol' = market_data_cache.asset_identifier OR pa.metadata->>'ticker' = market_data_cache.asset_identifier)
    AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
  ));

-- System can manage cache entries
CREATE POLICY "System can manage market data cache" 
  ON public.market_data_cache 
  FOR ALL 
  USING (true);

-- Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.clean_expired_market_data_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.market_data_cache 
    WHERE expires_at < now();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;
