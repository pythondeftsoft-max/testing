-- Create market_alerts table
CREATE TABLE public.market_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('stock', 'crypto', 'etf', 'bond', 'commodity')),
  operator text NOT NULL CHECK (operator IN ('price_above', 'price_below', 'change_pct_up', 'change_pct_down')),
  threshold numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  cooldown_minutes integer NOT NULL DEFAULT 60,
  last_triggered_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_market_alerts_user_id ON public.market_alerts(user_id);
CREATE INDEX idx_market_alerts_user_symbol ON public.market_alerts(user_id, symbol);

-- Enable RLS
ALTER TABLE public.market_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own alerts" 
ON public.market_alerts 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_market_alerts_updated_at
BEFORE UPDATE ON public.market_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();