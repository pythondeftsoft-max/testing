-- Fix crypto asset type standardization - update database to use 'crypto' instead of 'cryptocurrency' for consistency
UPDATE public.asset_categories 
SET name = 'crypto' 
WHERE name = 'cryptocurrency';

-- Add new liabilities tracking table for true net worth calculation
CREATE TABLE public.portfolio_liabilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL,
  liability_name TEXT NOT NULL,
  liability_description TEXT,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  original_amount NUMERIC,
  interest_rate NUMERIC,
  monthly_payment NUMERIC,
  maturity_date DATE,
  liability_type TEXT NOT NULL DEFAULT 'debt',
  is_secured BOOLEAN DEFAULT false,
  collateral_asset_id UUID REFERENCES public.portfolio_assets(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS for liabilities
ALTER TABLE public.portfolio_liabilities ENABLE ROW LEVEL SECURITY;

-- Create policies for portfolio liabilities
CREATE POLICY "Portfolio members can view liabilities" 
ON public.portfolio_liabilities 
FOR SELECT 
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]));

CREATE POLICY "Portfolio editors can manage liabilities" 
ON public.portfolio_liabilities 
FOR ALL 
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]));

-- Create wallet connections table for crypto wallet integration
CREATE TABLE public.wallet_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL,
  user_id UUID NOT NULL,
  wallet_type TEXT NOT NULL, -- 'metamask', 'coinbase', 'binance', 'manual'
  wallet_address TEXT,
  connection_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_frequency TEXT DEFAULT 'manual', -- 'manual', 'daily', 'hourly'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for wallet connections
ALTER TABLE public.wallet_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for wallet connections
CREATE POLICY "Portfolio members can view wallet connections" 
ON public.wallet_connections 
FOR SELECT 
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]));

CREATE POLICY "Portfolio editors can manage wallet connections" 
ON public.wallet_connections 
FOR ALL 
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]));

-- Add triggers for timestamps
CREATE TRIGGER update_portfolio_liabilities_updated_at
    BEFORE UPDATE ON public.portfolio_liabilities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_portfolio_assets_updated_at();

CREATE TRIGGER update_wallet_connections_updated_at
    BEFORE UPDATE ON public.wallet_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_portfolio_assets_updated_at();